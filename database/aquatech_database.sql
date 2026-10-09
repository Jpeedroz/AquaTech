-- ============================================================
-- AQUATECH - BANCO DE DADOS (PostgreSQL 11 ou superior)
-- ============================================================
--
-- Versão ajustada às necessidades do front-end (telas de Login,
-- Cadastro, Dashboard, Histórico, Irrigações, Consumo,
-- Configurações e Recuperação de senha).
--
-- Observação sobre fuso horário: as colunas TIMESTAMP não guardam
-- fuso. Recomenda-se que o Flask abra cada conexão com:
--     SET TIME ZONE 'America/Fortaleza';
--
-- ============================================================


-- ============================================================
-- 1. LIMPEZA
-- ============================================================

DROP VIEW IF EXISTS resumo_dashboard;
DROP VIEW IF EXISTS consumo_diario;

DROP TABLE IF EXISTS solicitacoes_troca_email CASCADE;
DROP TABLE IF EXISTS tokens_recuperacao_senha CASCADE;
DROP TABLE IF EXISTS leituras_sensores CASCADE;
DROP TABLE IF EXISTS sensores CASCADE;
DROP TABLE IF EXISTS eventos_irrigacao CASCADE;
DROP TABLE IF EXISTS dispositivos CASCADE;
DROP TABLE IF EXISTS propriedades CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP FUNCTION IF EXISTS atualizar_timestamp() CASCADE;


-- ============================================================
-- 2. FUNÇÃO AUXILIAR: atualizar "atualizado_em" automaticamente
-- ============================================================

CREATE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. USUÁRIOS
-- ============================================================
--
-- telefone:
--   usado no cadastro e em Configurações > Minha conta.
--
-- senha_alterada_em:
--   data da última troca de senha. O Flask recusa sessões/tokens
--   emitidos ANTES desta data (invalida sessões antigas).
--
-- O hash da senha é gerado pelo Flask. A senha nunca é guardada.
--
-- ============================================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,

    nome VARCHAR(100) NOT NULL,

    email VARCHAR(150) NOT NULL,

    telefone VARCHAR(20),

    senha_hash TEXT NOT NULL,

    senha_alterada_em TIMESTAMP,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- E-mail único sem diferenciar maiúsculas de minúsculas
-- (Joao@x.com e joao@x.com são o mesmo e-mail).
CREATE UNIQUE INDEX ux_usuarios_email
ON usuarios (LOWER(email));

CREATE TRIGGER trg_usuarios_atualizado
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();


-- ============================================================
-- 4. PROPRIEDADE
-- ============================================================
--
-- Cada usuário possui UMA propriedade (o sistema trabalha com
-- usuario_id -> propriedade_id). O mesmo registro alimenta o
-- cadastro (etapa 2) e Configurações > Minha propriedade.
--
-- limite_umidade:
--   umidade (%) ABAIXO da qual a irrigação LIGA.
--
-- limite_umidade_desliga:
--   umidade (%) em que a irrigação DESLIGA.
--   Precisa ser maior que limite_umidade.
--
-- O Dashboard desenha as duas linhas ("Liga 18%" e "Desliga 30%").
--
-- metodo_irrigacao:
--   as duas opções oferecidas nas telas.
--
-- ============================================================

CREATE TABLE propriedades (
    id SERIAL PRIMARY KEY,

    usuario_id INTEGER NOT NULL UNIQUE
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    nome VARCHAR(100) NOT NULL,

    localizacao VARCHAR(150),

    area_hectares NUMERIC(10,2)
        CHECK (area_hectares > 0),

    cultura VARCHAR(100),

    metodo_irrigacao VARCHAR(50) NOT NULL
        DEFAULT 'Bomba d''água'
        CHECK (metodo_irrigacao IN ('Bomba d''água', 'Gravidade')),

    limite_umidade NUMERIC(5,2) NOT NULL
        DEFAULT 18.00
        CHECK (
            limite_umidade >= 0
            AND limite_umidade <= 100
        ),

    limite_umidade_desliga NUMERIC(5,2) NOT NULL
        DEFAULT 30.00
        CHECK (
            limite_umidade_desliga >= 0
            AND limite_umidade_desliga <= 100
        ),

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (limite_umidade_desliga > limite_umidade)
);

CREATE TRIGGER trg_propriedades_atualizado
BEFORE UPDATE ON propriedades
FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();


-- ============================================================
-- 5. ESP32 / DISPOSITIVO
-- ============================================================
--
-- online:
-- TRUE  = ESP32 conectado
-- FALSE = ESP32 desconectado
--
-- irrigacao_ligada:
-- TRUE  = irrigação ligada
-- FALSE = irrigação desligada
--
-- ============================================================

CREATE TABLE dispositivos (
    id SERIAL PRIMARY KEY,

    propriedade_id INTEGER NOT NULL
        REFERENCES propriedades(id)
        ON DELETE CASCADE,

    codigo_dispositivo VARCHAR(50) UNIQUE NOT NULL,

    nome VARCHAR(100) NOT NULL,

    online BOOLEAN NOT NULL DEFAULT FALSE,

    irrigacao_ligada BOOLEAN NOT NULL DEFAULT FALSE,

    ultimo_sinal TIMESTAMP,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 6. SENSORES
-- ============================================================

CREATE TABLE sensores (
    id SERIAL PRIMARY KEY,

    dispositivo_id INTEGER NOT NULL
        REFERENCES dispositivos(id)
        ON DELETE CASCADE,

    tipo VARCHAR(30) NOT NULL
        CHECK (
            tipo IN (
                'umidade_solo',
                'temperatura',
                'vazao_agua'
            )
        ),

    nome VARCHAR(100) NOT NULL,

    unidade VARCHAR(20) NOT NULL,

    UNIQUE(dispositivo_id, tipo)
);


-- ============================================================
-- 7. LEITURAS DOS SENSORES
-- ============================================================

CREATE TABLE leituras_sensores (
    id SERIAL PRIMARY KEY,

    sensor_id INTEGER NOT NULL
        REFERENCES sensores(id)
        ON DELETE CASCADE,

    valor NUMERIC(10,2) NOT NULL,

    hora_leitura TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 8. HISTÓRICO DAS IRRIGAÇÕES
-- ============================================================
--
-- Cada registro representa um período em que a irrigação
-- ficou ligada. Enquanto encerrado_em for NULL, a irrigação
-- está em andamento.
--
-- O estado atual fica em dispositivos.irrigacao_ligada.
--
-- ============================================================

CREATE TABLE eventos_irrigacao (
    id SERIAL PRIMARY KEY,

    dispositivo_id INTEGER NOT NULL
        REFERENCES dispositivos(id)
        ON DELETE CASCADE,

    iniciado_em TIMESTAMP NOT NULL,

    encerrado_em TIMESTAMP,

    duracao_minutos INTEGER
        CHECK (
            duracao_minutos IS NULL
            OR duracao_minutos >= 0
        ),

    agua_utilizada_litros NUMERIC(10,2) NOT NULL
        DEFAULT 0
        CHECK (agua_utilizada_litros >= 0),

    umidade_antes NUMERIC(5,2)
        CHECK (
            umidade_antes IS NULL
            OR (
                umidade_antes >= 0
                AND umidade_antes <= 100
            )
        ),

    umidade_depois NUMERIC(5,2)
        CHECK (
            umidade_depois IS NULL
            OR (
                umidade_depois >= 0
                AND umidade_depois <= 100
            )
        ),

    CHECK (
        encerrado_em IS NULL
        OR encerrado_em >= iniciado_em
    )
);


-- ============================================================
-- 9. RECUPERAÇÃO DE SENHA
-- ============================================================
--
-- Fluxo: o usuário pede o link -> o Flask cria um token aleatório,
-- guarda SOMENTE o hash dele aqui e envia o token por e-mail.
-- Ao abrir o link, o Flask confere: o hash existe, não expirou
-- (expira_em) e ainda não foi usado (usado_em IS NULL).
-- Ao salvar a nova senha, usado_em é preenchido (uso único).
--
-- ============================================================

CREATE TABLE tokens_recuperacao_senha (
    id SERIAL PRIMARY KEY,

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expira_em TIMESTAMP NOT NULL,

    usado_em TIMESTAMP,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 10. TROCA DE E-MAIL COM CONFIRMAÇÃO
-- ============================================================
--
-- O e-mail em usuarios SÓ muda depois que o usuário clica no
-- link enviado para o NOVO endereço (confirmado_em preenchido).
--
-- ============================================================

CREATE TABLE solicitacoes_troca_email (
    id SERIAL PRIMARY KEY,

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    novo_email VARCHAR(150) NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expira_em TIMESTAMP NOT NULL,

    confirmado_em TIMESTAMP,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 11. ÍNDICES
-- ============================================================

CREATE INDEX idx_dispositivos_propriedade
ON dispositivos(propriedade_id);

CREATE INDEX idx_sensores_dispositivo
ON sensores(dispositivo_id);

CREATE INDEX idx_leituras_sensor_hora
ON leituras_sensores(sensor_id, hora_leitura);

CREATE INDEX idx_eventos_dispositivo_data
ON eventos_irrigacao(dispositivo_id, iniciado_em);

-- Um dispositivo não pode ter duas irrigações abertas ao mesmo tempo
CREATE UNIQUE INDEX ux_evento_aberto_por_dispositivo
ON eventos_irrigacao(dispositivo_id)
WHERE encerrado_em IS NULL;

CREATE INDEX idx_tokens_recuperacao_usuario
ON tokens_recuperacao_senha(usuario_id);

CREATE INDEX idx_troca_email_usuario
ON solicitacoes_troca_email(usuario_id);

-- (O índice de propriedades por usuário já existe pela
--  restrição UNIQUE em propriedades.usuario_id.)


-- ============================================================
-- 12. CONSUMO DIÁRIO
-- ============================================================
--
-- O consumo diário é calculado a partir dos eventos
-- de irrigação (não é duplicado em outra tabela).
--
-- Alimenta: cartões e gráfico da tela "Consumo de água"
-- (hoje, 7 dias, 30 dias, total, período personalizado,
-- maior, menor e média).
--
-- Só existem linhas para os dias que tiveram irrigação.
--
-- ============================================================

CREATE VIEW consumo_diario AS

SELECT
    d.propriedade_id,

    DATE(e.iniciado_em) AS data_consumo,

    ROUND(
        SUM(e.agua_utilizada_litros),
        2
    ) AS agua_utilizada_litros

FROM eventos_irrigacao e

JOIN dispositivos d
    ON d.id = e.dispositivo_id

GROUP BY
    d.propriedade_id,
    DATE(e.iniciado_em);


-- ============================================================
-- 13. USUÁRIO DE TESTE
-- ============================================================
--
-- ATENÇÃO: 'senha_teste_hash' NÃO é um hash válido. Serve só
-- para preencher a coluna. Para testar o login de verdade, o
-- Flask deve gravar aqui um hash real (ex.: werkzeug).
--
-- ============================================================

INSERT INTO usuarios (
    nome,
    email,
    telefone,
    senha_hash
)
VALUES (
    'João Pereira',
    'joao@example.com',
    '(88) 99999-9999',
    'senha_teste_hash'
);


-- ============================================================
-- 14. PROPRIEDADE DE TESTE
-- ============================================================

INSERT INTO propriedades (
    usuario_id,
    nome,
    localizacao,
    area_hectares,
    cultura,
    metodo_irrigacao,
    limite_umidade,
    limite_umidade_desliga
)
VALUES (
    1,
    'Sítio Boa Vista',
    'Juazeiro do Norte - CE',
    2.00,
    'Cebola',
    'Bomba d''água',
    18.00,
    30.00
);


-- ============================================================
-- 15. ESP32 DE TESTE
-- ============================================================

INSERT INTO dispositivos (
    propriedade_id,
    codigo_dispositivo,
    nome,
    online,
    irrigacao_ligada,
    ultimo_sinal
)
VALUES (
    1,
    'ESP32-001',
    'ESP32 AquaTech',
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP
);


-- ============================================================
-- 16. SENSORES DE TESTE
-- ============================================================

INSERT INTO sensores (
    dispositivo_id,
    tipo,
    nome,
    unidade
)
VALUES
(
    1,
    'umidade_solo',
    'Sensor de Umidade',
    '%'
),
(
    1,
    'temperatura',
    'Sensor de Temperatura',
    '°C'
),
(
    1,
    'vazao_agua',
    'Sensor de Vazão',
    'L/min'
);


-- ============================================================
-- 17. IRRIGAÇÕES DE TESTE (últimos 30 dias, valores fixos)
-- ============================================================
--
-- HOJE: 2 irrigações = 270 L
--   09:00 às 11:00 (120 min, 180 L, umidade 17% -> 30%)
--   13:00 às 14:00 ( 60 min,  90 L, umidade 18% -> 30%)
--
-- Últimos 6 dias antes de hoje: 130, 190, 220, 120, 190, 140 L
-- (somando com hoje: 1.260 L em 7 dias).
--
-- Dias anteriores: uma irrigação por dia às 09:00, com vazão
-- de 1,5 L/min, sem números aleatórios.
--
-- ============================================================

INSERT INTO eventos_irrigacao (
    dispositivo_id,
    iniciado_em,
    encerrado_em,
    duracao_minutos,
    agua_utilizada_litros,
    umidade_antes,
    umidade_depois
)
VALUES
(
    1,
    CURRENT_DATE + INTERVAL '9 hours',
    CURRENT_DATE + INTERVAL '11 hours',
    120,
    180,
    17,
    30
),
(
    1,
    CURRENT_DATE + INTERVAL '13 hours',
    CURRENT_DATE + INTERVAL '14 hours',
    60,
    90,
    18,
    30
);

INSERT INTO eventos_irrigacao (
    dispositivo_id,
    iniciado_em,
    encerrado_em,
    duracao_minutos,
    agua_utilizada_litros,
    umidade_antes,
    umidade_depois
)
SELECT
    1,
    dia + INTERVAL '9 hours',
    dia + INTERVAL '9 hours' + make_interval(mins => minutos),
    minutos,
    litros,
    17 + (n % 4),
    30
FROM (
    SELECT
        n,
        CURRENT_DATE - n AS dia,
        litros,
        ROUND(litros / 1.5)::INTEGER AS minutos
    FROM (
        SELECT
            n,
            CASE n
                WHEN 1 THEN 130
                WHEN 2 THEN 190
                WHEN 3 THEN 220
                WHEN 4 THEN 120
                WHEN 5 THEN 190
                WHEN 6 THEN 140
                ELSE 100 + ((n * 37) % 13) * 10
            END AS litros
        FROM generate_series(1, 29) AS n
    ) AS base
) AS dias;


-- ============================================================
-- 18. LEITURAS DE UMIDADE E TEMPERATURA DE TESTE
-- ============================================================
--
-- 8 leituras por dia (07:00 às 14:00), nos últimos 30 dias.
-- Hoje: valores fixos (umidade 25, 21, 17, 24, 30, 24, 18, 30).
-- Dias anteriores: os mesmos valores com pequena variação
-- calculada (sem RANDOM), para o teste ser sempre igual.
--
-- ============================================================

WITH base (k, hora, umid, temperatura) AS (
    VALUES
        (0,  7, 25, 27),
        (1,  8, 21, 28),
        (2,  9, 17, 29),
        (3, 10, 24, 29),
        (4, 11, 30, 28),
        (5, 12, 24, 32),
        (6, 13, 18, 33),
        (7, 14, 30, 28)
)
INSERT INTO leituras_sensores (
    sensor_id,
    valor,
    hora_leitura
)
SELECT
    1,
    LEAST(45, GREATEST(10,
        b.umid + CASE WHEN n = 0 THEN 0 ELSE ((n * 3 + b.k) % 5) - 2 END
    )),
    (CURRENT_DATE - n) + make_interval(hours => b.hora)
FROM base b
CROSS JOIN generate_series(0, 29) AS n

UNION ALL

SELECT
    2,
    b.temperatura + CASE WHEN n = 0 THEN 0 ELSE ((n + b.k) % 3) - 1 END,
    (CURRENT_DATE - n) + make_interval(hours => b.hora)
FROM base b
CROSS JOIN generate_series(0, 29) AS n;


-- ============================================================
-- 19. LEITURAS DE VAZÃO DE TESTE (hoje)
-- ============================================================
--
-- Durante a irrigação: 1,5 L/min. Fora dela: 0 L/min.
--
-- ============================================================

INSERT INTO leituras_sensores (
    sensor_id,
    valor,
    hora_leitura
)
VALUES
(3, 0,   CURRENT_DATE + INTERVAL '8 hours 30 minutes'),
(3, 1.50, CURRENT_DATE + INTERVAL '9 hours 15 minutes'),
(3, 1.50, CURRENT_DATE + INTERVAL '10 hours 15 minutes'),
(3, 0,   CURRENT_DATE + INTERVAL '11 hours 15 minutes'),
(3, 1.50, CURRENT_DATE + INTERVAL '13 hours 15 minutes'),
(3, 0,   CURRENT_DATE + INTERVAL '14 hours 15 minutes');


-- ============================================================
-- 20. VIEW RESUMIDA DO DASHBOARD
-- ============================================================
--
-- Uma linha por usuário/propriedade/dispositivo.
-- LEFT JOIN: um usuário recém-cadastrado (sem propriedade ou
-- sem ESP32) também aparece, com os campos vazios (NULL).
--
-- ============================================================

CREATE VIEW resumo_dashboard AS

SELECT

    u.id AS usuario_id,
    u.nome AS nome_usuario,

    p.id AS propriedade_id,
    p.nome AS nome_propriedade,
    p.localizacao,
    p.area_hectares,
    p.cultura,
    p.metodo_irrigacao,
    p.limite_umidade,
    p.limite_umidade_desliga,

    d.id AS dispositivo_id,
    d.codigo_dispositivo,
    d.online,
    d.irrigacao_ligada,
    d.ultimo_sinal,

    (
        SELECT sr.valor
        FROM leituras_sensores sr

        JOIN sensores s
            ON s.id = sr.sensor_id

        WHERE s.dispositivo_id = d.id
          AND s.tipo = 'umidade_solo'

        ORDER BY sr.hora_leitura DESC

        LIMIT 1
    ) AS umidade_atual,

    (
        SELECT sr.valor
        FROM leituras_sensores sr

        JOIN sensores s
            ON s.id = sr.sensor_id

        WHERE s.dispositivo_id = d.id
          AND s.tipo = 'temperatura'

        ORDER BY sr.hora_leitura DESC

        LIMIT 1
    ) AS temperatura_atual,

    (
        SELECT sr.valor
        FROM leituras_sensores sr

        JOIN sensores s
            ON s.id = sr.sensor_id

        WHERE s.dispositivo_id = d.id
          AND s.tipo = 'vazao_agua'

        ORDER BY sr.hora_leitura DESC

        LIMIT 1
    ) AS vazao_atual,

    COALESCE(
        (
            SELECT SUM(e.agua_utilizada_litros)

            FROM eventos_irrigacao e

            WHERE e.dispositivo_id = d.id

              AND DATE(e.iniciado_em) = CURRENT_DATE
        ),
        0
    ) AS consumo_agua_hoje

FROM usuarios u

LEFT JOIN propriedades p
    ON p.usuario_id = u.id

LEFT JOIN dispositivos d
    ON d.propriedade_id = p.id;
