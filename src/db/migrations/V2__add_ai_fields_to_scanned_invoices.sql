-- Use JSONB for embedding to support databases without pgvector extension
-- Note: If you have pgvector, you can change this column to vector(1536) for efficient search

-- Add embedding column (JSONB fallback for vector)
ALTER TABLE scanned_invoices ADD COLUMN embedding JSONB DEFAULT '[]';

-- Add metadata column for storing extra extracted fields
ALTER TABLE scanned_invoices ADD COLUMN metadata JSONB DEFAULT '{}';