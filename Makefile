.PHONY: reset start enroll run-api

reset:
	bash ~/dev/fabric-supplychain-app/supplychain-api/scripts/reset-all.sh

reset-all-docker:
	bash ~/dev/fabric-supplychain-app/supplychain-api/scripts/reset-all-docker.sh

start:
	cd ~/dev/fabric-supplychain-app/fabric-samples/test-network && \
	./network.sh up createChannel -ca && \
	./network.sh deployCC -ccn part_event -ccp ../../chaincode/part_event_js -ccl javascript

enroll:
	node ~/dev/fabric-supplychain-app/supplychain-api/scripts/enrollAdmin.js && \
	node ~/dev/fabric-supplychain-app/supplychain-api/scripts/registerUser.js

run-api:
	node ~/dev/fabric-supplychain-app/supplychain-api/server.js

logs:
	docker ps -a
	docker logs $(docker ps -q --filter "name=dev-peer0")

status:
	curl http://localhost:3000/api/events | jq .
