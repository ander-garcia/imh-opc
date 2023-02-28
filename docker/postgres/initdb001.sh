set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"<<-EOSQL 
CREATE TABLE IF NOT EXISTS public.boiler
(
    "time" timestamp with time zone NOT NULL,
    top real,
    bottom real,
    pressure real,
    "heaterState" smallint,
    "boilerId" character varying COLLATE pg_catalog."default"
);
SELECT create_hypertable('boiler','time');    

  

    GRANT ALL ON TABLE boiler TO postgres;
    CREATE USER grafanareader WITH PASSWORD 'password2022';        
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafanareader;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO grafanareader;
EOSQL