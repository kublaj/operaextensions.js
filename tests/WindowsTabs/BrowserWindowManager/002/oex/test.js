var win = null; win2 = null;
var tests = {}, // Asynchronous tests
    eventsReceived = [], // List of events received
    eventsExpected = ["create"]; // List of expected events

tests["create"] = async_test("Window create event");
tests["order"]  = async_test("Order of events");

function getHandler(type) {
	return function(evt) {
		tests[type].step(function() {
			assert_equals(evt.type, type, "Event type should be '" + type + "'");
			assert_exists(evt, "browserWindow", "The event object should have a browserWindow property");
			assert_equals(evt.browserWindow.id, win.id, "The event should refer to the created window");
		});
		tests[type].done();
	}
}

function eventOrder(evt) {
	//opera.postError("Event received: " + evt.type + ", Window: " + evt.browserWindow.id);
	eventsReceived.push(evt.type);
	if (eventsReceived.length == eventsExpected.length) {
		setTimeout(function() {
			//opera.postError("Received: " + eventsReceived);
			tests["order"].step(function() {
				for (var i = 0; i < eventsReceived.length; i++) {
					assert_equals(eventsReceived[i], eventsExpected[i], "The event order should match. Event number: " + i)
				}
			});
			tests["order"].done();
		}, 500); // Wait, incase new unexpected events fire
	}
}

windows.addEventListener("create", getHandler("create"), false);

windows.addEventListener("create", eventOrder, false);
windows.addEventListener("close",  eventOrder, false);
windows.addEventListener("blur",   eventOrder, false);
windows.addEventListener("focus",  eventOrder, false);


try {
	win = createWindow(); // Create event
} catch(e) {
	for (var n in tests)
		tests[n].step(function(){ assert_unreached("Couldn't create new window") });
}
