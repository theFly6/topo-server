#!/bin/bash
set -euo pipefail

# ===================== 核心配置项（按需修改）=====================
# 项目根目录（脚本所在目录）
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 日志目录（自动创建）
LOG_DIR="${PROJECT_DIR}/logs"
# 核心启动日志（永久保留，不参与清理）
BOOT_LOG="${LOG_DIR}/server-boot.log"
# 服务运行日志（按天分割，参与清理）
LOG_PREFIX="topology-server-run"
# PID目录（记录主服务/清理进程PID）
PID_DIR="${PROJECT_DIR}/pid"
# 主服务PID文件
SERVER_PID_FILE="${PID_DIR}/server.pid"
# 日志清理进程PID文件
CLEANER_PID_FILE="${PID_DIR}/cleaner.pid"
# 日志保留天数（超过则删除）
KEEP_DAYS=7
# 日志总大小阈值（MB）：超过100MB触发清理
SIZE_THRESHOLD_MB=100
# 清理后目标大小（MB）：清理到低于80MB
TARGET_SIZE_MB=80
# 日志清理检查间隔（秒）：每分钟检查一次
CHECK_INTERVAL=60
# 核心启动命令
# SERVER_CMD="npx ts-node ${PROJECT_DIR}/src/server.ts"
SERVER_CMD="${PROJECT_DIR}/node_modules/.bin/ts-node ${PROJECT_DIR}/src/server.ts"

# ===================== 工具函数 =====================
# 函数：打印带时间戳的日志（写入启动日志+控制台）
log() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local msg="[$timestamp] $1"
    echo "$msg" | tee -a "${BOOT_LOG}"
}

# 函数：计算目录总大小（MB，保留2位小数）
get_dir_size_mb() {
    local dir="$1"
    # 计算字节数转MB，排除启动日志（避免误算核心日志）
    local size_bytes=$(du -sb --exclude="$(basename ${BOOT_LOG})" "${dir}" 2>/dev/null | awk '{print $1}')
    [ -z "${size_bytes}" ] && size_bytes=0
    local size_mb=$(echo "scale=2; ${size_bytes}/1024/1024" | bc)
    echo "${size_mb}"
}

# 函数：检查进程是否存活
is_process_running() {
    local pid="$1"
    if [ -n "${pid}" ] && ps -p "${pid}" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 函数：启动日志清理进程（独立后台）
start_cleaner() {
    # 检查清理进程是否已运行
    if [ -f "${CLEANER_PID_FILE}" ]; then
        local existing_cleaner_pid=$(awk -F'|' '{print $1}' "${CLEANER_PID_FILE}" 2>/dev/null || true)
        if is_process_running "${existing_cleaner_pid}"; then
            log "日志清理进程已在运行（PID: ${existing_cleaner_pid}），无需重复启动"
            return 0
        else
            log "发现清理进程残留PID文件，已清理（进程${existing_cleaner_pid}未运行）"
            rm -f "${CLEANER_PID_FILE}"
        fi
    fi

    log "启动日志清理进程（后台）..."
    # 启动独立后台清理进程，脱离当前shell
    nohup bash -c "
        while true; do
            local current_time=\$(date +\"%Y-%m-%d %H:%M:%S\")
            local log_msg_prefix=\"[\$current_time] 日志清理进程\"

            # 1. 清理超过7天的日志（排除启动日志）
            find \"${LOG_DIR}\" -name \"${LOG_PREFIX}-*.log\" -type f -mtime +${KEEP_DAYS} -print0 | while IFS= read -r -d '' file; do
                rm -f \"\$file\"
                echo \"\${log_msg_prefix} 删除7天前日志：\$file\" >> \"${BOOT_LOG}\"
            done

            # 2. 检查日志总大小，超过阈值则清理早期日志到目标大小
            local current_size=\$(get_dir_size_mb \"${LOG_DIR}\")
            local current_size_int=\$(echo \"\${current_size}\" | awk -F. '{print \$1}')
            if [ \"\${current_size_int}\" -ge \"${SIZE_THRESHOLD_MB}\" ]; then
                echo \"\${log_msg_prefix} 日志总大小(\${current_size}MB)超过阈值(${SIZE_THRESHOLD_MB}MB)，开始清理早期日志...\" >> \"${BOOT_LOG}\"
                
                # 按修改时间排序（最早的在前），排除启动日志
                find \"${LOG_DIR}\" -name \"${LOG_PREFIX}-*.log\" -type f -printf \"%T@ %p\n\" | sort -n | cut -d' ' -f2- | while read -r old_file; do
                    rm -f \"\$old_file\"
                    echo \"\${log_msg_prefix} 删除早期日志：\$old_file\" >> \"${BOOT_LOG}\"
                    
                    # 检查当前大小是否低于目标值
                    local new_size=\$(get_dir_size_mb \"${LOG_DIR}\")
                    local new_size_int=\$(echo \"\${new_size}\" | awk -F. '{print \$1}')
                    if [ \"\${new_size_int}\" -le \"${TARGET_SIZE_MB}\" ]; then
                        echo \"\${log_msg_prefix} 日志清理完成，当前大小(\${new_size}MB)低于目标值(${TARGET_SIZE_MB}MB)\" >> \"${BOOT_LOG}\"
                        break
                    fi
                done
            fi

            # 等待检查间隔
            sleep ${CHECK_INTERVAL}
        done
    " > /dev/null 2>&1 &

    # 记录清理进程PID和启动时间
    local cleaner_pid=$!
    echo "${cleaner_pid}|启动时间: $(date +"%Y-%m-%d %H:%M:%S")" > "${CLEANER_PID_FILE}"
    log "日志清理进程启动成功（PID: ${cleaner_pid}，PID文件: ${CLEANER_PID_FILE}）"
}

# 函数：启动主服务（完全后台）
start_server() {
    # 1. 初始化目录
    mkdir -p "${LOG_DIR}" "${PID_DIR}"
    log "初始化完成：日志目录=${LOG_DIR}，PID目录=${PID_DIR}"

    # 2. 检查主服务是否已运行
    if [ -f "${SERVER_PID_FILE}" ]; then
        local existing_server_pid=$(awk -F'|' '{print $1}' "${SERVER_PID_FILE}" 2>/dev/null || true)
        if is_process_running "${existing_server_pid}"; then
            log "错误：主服务已在运行（PID: ${existing_server_pid}），请先执行 ./run.sh stop 停止后再启动！"
            exit 1
        else
            log "发现主服务残留PID文件，已清理（进程${existing_server_pid}未运行）"
            rm -f "${SERVER_PID_FILE}"
        fi
    fi

    # 3. 启动主服务（完全后台，脱离当前shell）
    log "启动主服务（后台运行）..."
    TODAY_LOG="${LOG_DIR}/${LOG_PREFIX}-$(date +%Y-%m-%d).log"
    # 确保ts工具存在（无则降级）
    if command -v ts >/dev/null 2>&1; then
        bash -c "${SERVER_CMD} 2>&1 | ts '[%Y-%m-%d %H:%M:%S]'" >> "${TODAY_LOG}" 2>&1 &
    else
        log "提示：未安装moreutils（ts命令），日志无行级时间戳（可执行sudo apt install moreutils安装）"
        ${SERVER_CMD} >> "${TODAY_LOG}" 2>&1 &
    fi

    # 等待3s后从4000端口获取PID
    sleep 3
    server_pid=$(lsof -i :4000 -sTCP:LISTEN -t 2>/dev/null || true)

    # 4. 记录主服务PID和启动时间
    echo "${server_pid}|启动时间: $(date +"%Y-%m-%d %H:%M:%S")" > "${SERVER_PID_FILE}"
    log "主服务启动成功（PID: ${server_pid}，日志文件: ${TODAY_LOG}，PID文件: ${SERVER_PID_FILE}）"

    # 5. 启动日志清理进程
    start_cleaner

    log "所有服务启动完成，已后台运行（可执行 ./run.sh stop 停止）"
}

# 函数：停止所有服务（主服务+清理进程）
stop_server() {
    log "开始停止所有服务..."

    # 1. 停止主服务
    local server_stop_ok=0
    if [ -f "${SERVER_PID_FILE}" ]; then
        local server_pid=$(awk -F'|' '{print $1}' "${SERVER_PID_FILE}" 2>/dev/null || true)
        if is_process_running "${server_pid}"; then
            log "停止主服务（PID: ${server_pid}）..."
            kill "${server_pid}" > /dev/null 2>&1 || server_stop_ok=1
            # 记录主服务结束时间
            sed -i "s|^${server_pid}|${server_pid}|; s|$| 结束时间: $(date +"%Y-%m-%d %H:%M:%S")|" "${SERVER_PID_FILE}"
            if [ ${server_stop_ok} -eq 0 ]; then
                log "主服务已停止"
            else
                log "警告：停止主服务失败，可能需要手动kill PID ${server_pid}"
            fi
        else
            log "主服务未运行（PID: ${server_pid}），清理残留PID文件"
        fi
        rm -f "${SERVER_PID_FILE}"
    else
        log "主服务PID文件不存在，无需停止"
    fi

    # 2. 停止日志清理进程
    local cleaner_stop_ok=0
    if [ -f "${CLEANER_PID_FILE}" ]; then
        local cleaner_pid=$(awk -F'|' '{print $1}' "${CLEANER_PID_FILE}" 2>/dev/null || true)
        if is_process_running "${cleaner_pid}"; then
            log "停止日志清理进程（PID: ${cleaner_pid}）..."
            kill "${cleaner_pid}" > /dev/null 2>&1 || cleaner_stop_ok=1
            # 记录清理进程结束时间
            sed -i "s|^${cleaner_pid}|${cleaner_pid}|; s|$| 结束时间: $(date +"%Y-%m-%d %H:%M:%S")|" "${CLEANER_PID_FILE}"
            if [ ${cleaner_stop_ok} -eq 0 ]; then
                log "日志清理进程已停止"
            else
                log "警告：停止清理进程失败，可能需要手动kill PID ${cleaner_pid}"
            fi
        else
            log "日志清理进程未运行（PID: ${cleaner_pid}），清理残留PID文件"
        fi
        rm -f "${CLEANER_PID_FILE}"
    else
        log "清理进程PID文件不存在，无需停止"
    fi

    log "所有服务停止操作完成"
}

# ===================== 命令行参数解析 =====================
usage() {
    echo "用法："
    echo "  /bin/bash ./run.sh start   - 后台启动服务和日志清理进程"
    echo "  /bin/bash ./run.sh stop    - 停止服务和日志清理进程"
    echo "  /bin/bash ./run.sh status  - 查看服务运行状态"
    exit 1
}

# 无参数时显示用法
if [ $# -eq 0 ]; then
    usage
fi

# 解析命令
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    status)
        log "=== 服务状态 ==="
        # 检查主服务
        if [ -f "${SERVER_PID_FILE}" ]; then
            server_pid=$(awk -F'|' '{print $1}' "${SERVER_PID_FILE}" 2>/dev/null || true)
            if is_process_running "${server_pid}"; then
                log "主服务：运行中（PID: ${server_pid}）"
                cat "${SERVER_PID_FILE}" | tee -a "${BOOT_LOG}"
            else
                log "主服务：已停止（残留PID: ${server_pid}）"
            fi
        else
            log "主服务：未启动"
        fi
        # 检查清理进程
        if [ -f "${CLEANER_PID_FILE}" ]; then
            cleaner_pid=$(awk -F'|' '{print $1}' "${CLEANER_PID_FILE}" 2>/dev/null || true)
            if is_process_running "${cleaner_pid}"; then
                log "日志清理进程：运行中（PID: ${cleaner_pid}）"
                cat "${CLEANER_PID_FILE}" | tee -a "${BOOT_LOG}"
            else
                log "日志清理进程：已停止（残留PID: ${cleaner_pid}）"
            fi
        else
            log "日志清理进程：未启动"
        fi
        # 日志大小
        log "当前日志总大小（不含启动日志）：$(get_dir_size_mb "${LOG_DIR}")MB"
        ;;
    *)
        echo "错误：无效的命令 '$1'"
        usage
        ;;
esac

# 查看4000端口占用（调试用）
# netstat -tlnp | grep 4000