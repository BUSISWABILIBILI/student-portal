import pool from "../config/database.js";

export const createAuditLog = async (
  { userId, action, entityType, entityId, metadata = null, ipAddress = null },
  connection = pool,
) => {
  await connection.execute(
    `
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        ip_address
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      action,
      entityType,
      entityId ? String(entityId) : null,
      metadata ? JSON.stringify(metadata) : null,
      ipAddress,
    ],
  );
};
