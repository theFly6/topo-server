/** 平台相关配置：metax 默认 14735，tj 平台用 22 */
export const SSH_PORT = process.env.SSH_PORT || '14735';

export const WORKERS_CONF = process.env.WORKERS_CONF || './workers.conf';

export const PLATFORM = process.env.PLATFORM || 'metax';
