import { Pool, PoolClient } from 'pg';
import { db } from '../database/connection';
import { logger } from '../utils/logger';

export interface AuditFields {
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  deleted_at?: Date;
  deleted_by?: string;
}

export interface BaseEntity extends AuditFields {
  id: string;
}

export interface QueryOptions {
  includeDeleted?: boolean;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface WhereClause {
  [key: string]: any;
}

export abstract class BaseModel<T extends BaseEntity> {
  protected tableName: string;
  protected selectFields: string[];
  
  constructor(tableName: string, selectFields: string[] = ['*']) {
    this.tableName = tableName;
    this.selectFields = selectFields;
  }

  protected buildSelectQuery(options: QueryOptions = {}): string {
    const fields = this.selectFields.join(', ');
    let query = `SELECT ${fields} FROM ${this.tableName}`;
    
    if (!options.includeDeleted) {
      query += ' WHERE deleted_at IS NULL';
    }
    
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    return query;
  }

  protected buildWhereClause(where: WhereClause, options: QueryOptions = {}): { query: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (!options.includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    Object.entries(where).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else {
        conditions.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    return { query: whereClause, params };
  }

  async findById(id: string, options: QueryOptions = {}): Promise<T | null> {
    try {
      const { query: whereClause, params } = this.buildWhereClause({ id }, options);
      const fields = this.selectFields.join(', ');
      const queryText = `SELECT ${fields} FROM ${this.tableName}${whereClause}`;
      
      const rows = await db.query<T>(queryText, params);
      return rows[0] || null;
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by id:`, error);
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<T[]> {
    try {
      const query = this.buildSelectQuery(options);
      return await db.query<T>(query);
    } catch (error) {
      logger.error(`Error finding all ${this.tableName}:`, error);
      throw error;
    }
  }

  async findWhere(where: WhereClause, options: QueryOptions = {}): Promise<T[]> {
    try {
      const { query: whereClause, params } = this.buildWhereClause(where, options);
      const fields = this.selectFields.join(', ');
      let query = `SELECT ${fields} FROM ${this.tableName}${whereClause}`;
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
      
      return await db.query<T>(query, params);
    } catch (error) {
      logger.error(`Error finding ${this.tableName} with where clause:`, error);
      throw error;
    }
  }

  async findOne(where: WhereClause, options: QueryOptions = {}): Promise<T | null> {
    const results = await this.findWhere(where, { ...options, limit: 1 });
    return results[0] || null;
  }

  async create(data: Partial<T>, userId?: string): Promise<T> {
    try {
      const now = new Date();
      const createData = {
        ...data,
        id: data.id || undefined, // Let database generate if not provided
        created_at: now,
        updated_at: now,
        created_by: userId,
        updated_by: userId,
      };

      const fields = Object.keys(createData).filter(key => createData[key as keyof typeof createData] !== undefined);
      const values = fields.map(key => createData[key as keyof typeof createData]);
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
      
      const queryText = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const rows = await db.query<T>(queryText, values);
      return rows[0];
    } catch (error) {
      logger.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>, userId?: string): Promise<T | null> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date(),
        updated_by: userId,
      };

      const fields = Object.keys(updateData).filter(key => 
        updateData[key as keyof typeof updateData] !== undefined && key !== 'id'
      );
      const values = fields.map(key => updateData[key as keyof typeof updateData]);
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const queryText = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE id = $${fields.length + 1} AND deleted_at IS NULL
        RETURNING *
      `;
      
      const rows = await db.query<T>(queryText, [...values, id]);
      return rows[0] || null;
    } catch (error) {
      logger.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id: string, userId?: string, hard: boolean = false): Promise<boolean> {
    try {
      if (hard) {
        const queryText = `DELETE FROM ${this.tableName} WHERE id = $1`;
        const result = await db.query(queryText, [id]);
        return result.length > 0;
      } else {
        // Soft delete
        const queryText = `
          UPDATE ${this.tableName}
          SET deleted_at = $1, deleted_by = $2
          WHERE id = $3 AND deleted_at IS NULL
          RETURNING id
        `;
        const rows = await db.query(queryText, [new Date(), userId, id]);
        return rows.length > 0;
      }
    } catch (error) {
      logger.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  async restore(id: string, userId?: string): Promise<T | null> {
    try {
      const queryText = `
        UPDATE ${this.tableName}
        SET deleted_at = NULL, deleted_by = NULL, updated_at = $1, updated_by = $2
        WHERE id = $3
        RETURNING *
      `;
      const rows = await db.query<T>(queryText, [new Date(), userId, id]);
      return rows[0] || null;
    } catch (error) {
      logger.error(`Error restoring ${this.tableName}:`, error);
      throw error;
    }
  }

  async count(where: WhereClause = {}, options: QueryOptions = {}): Promise<number> {
    try {
      const { query: whereClause, params } = this.buildWhereClause(where, options);
      const queryText = `SELECT COUNT(*) as count FROM ${this.tableName}${whereClause}`;
      const rows = await db.query<{ count: string }>(queryText, params);
      return parseInt(rows[0].count, 10);
    } catch (error) {
      logger.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }
  }

  async exists(where: WhereClause, options: QueryOptions = {}): Promise<boolean> {
    const count = await this.count(where, options);
    return count > 0;
  }

  async transaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    return await db.transaction(callback);
  }
}