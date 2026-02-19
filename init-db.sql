-- Script de inicialização do banco de dados
-- Executado automaticamente quando o container PostgreSQL é criado

CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT 'Banco de dados oficina_db inicializado com sucesso!' AS status;
