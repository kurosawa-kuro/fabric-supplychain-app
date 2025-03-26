cd supplychain-api

docker build -t supplychain-api .
docker run --rm -it \
  --network fabric_test \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/wallet:/app/wallet \
  -e HFC_LOGGING='{"debug":"off","info":"off"}' \
  -e NODE_ENV=development \
  -e PORT=3000 \
  --name supplychain-api \
  supplychain-api:latest


 356  docker login
  357  docker build -t kurosawakuro/supplychain-api:latest .
  358  docker push kurosawakuro/supplychain-api:latest