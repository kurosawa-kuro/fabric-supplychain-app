.PHONY: reset start enroll run-api

reset:
	bash ~/dev/hyperledger-fabric-helloworld/api/scripts/reset-all.sh

start:
	cd ~/dev/hyperledger-fabric-helloworld/fabric-samples/test-network && \
	./network.sh up createChannel -ca && \
	./network.sh deployCC -ccn part_event -ccp ../../chaincode/part_event_js -ccl javascript

enroll:
	node ~/dev/hyperledger-fabric-helloworld/api/scripts/enrollAdmin.js && \
	node ~/dev/hyperledger-fabric-helloworld/api/scripts/registerUser.js

run-api:
	node ~/dev/hyperledger-fabric-helloworld/api/server.js

logs:
	docker ps -a
	docker logs $(docker ps -q --filter "name=dev-peer0")

status:
	curl http://localhost:3000/api/events | jq .
