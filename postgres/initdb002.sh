set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER"  <<-EOSQL         
    CREATE DATABASE grafana;
    CREATE USER grafanauser WITH ENCRYPTED PASSWORD 'grafanaPass2022';
    GRANT ALL PRIVILEGES ON DATABASE grafana TO grafanauser;
EOSQL