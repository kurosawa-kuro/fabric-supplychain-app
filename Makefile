.PHONY: reset start enroll run-api

reset:
	bash reset-all.sh

start:
	cd fabric-samples/test-network && \
	./network.sh up createChannel -ca && \
	./network.sh deployCC -ccn part_event -ccp ../../chaincode/part_event_js -ccl javascript

enroll:
	cd api && \
	node scripts/enrollAdmin.js && \
	node scripts/registerUser.js

run-api:
	cd api && node app.js
