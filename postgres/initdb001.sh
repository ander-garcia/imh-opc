set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"<<-EOSQL 
    CREATE TABLE  data ( 
         "time" timestamp with time zone NOT NULL,
    temperature  double PRECISION NULL,
    sensor text NULL DEFAULT '-'
        );
    SELECT create_hypertable('data','time');    

  

    GRANT ALL ON TABLE data TO postgres;
    CREATE USER grafanareader WITH PASSWORD 'password2022';        
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafanareader;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO grafanareader;
EOSQL