
var BrowserTabManager = function( parentObj ) {

  OPromise.call( this );

  // Set up 0 mock BrowserTab objects at startup
  this.length = 0;

  this._parent = parentObj;

  // Remove all collection items and replace with browserTabs
  this.replaceTabs = function( browserTabs ) {

    for( var i = 0, l = this.length; i < l; i++ ) {
      delete this[ i ];
    }
    this.length = 0;

    if(browserTabs.length <= 0) {
      return;
    }

    for( var i = 0, l = browserTabs.length; i < l; i++ ) {
      if(this !== OEX.tabs) {
        browserTabs[ i ].properties.index = i;
      }
      this[ i ] = browserTabs[ i ];
    }
    this.length = browserTabs.length;

    // Set focused on first tab object, unless some other tab object has focused=='true'
    var focusFound = false;
    for(var i = 0, l = browserTabs.length; i < l; i++) {
      if(browserTabs[i].properties.active == true) {
        focusFound = true;
        break;
      }
    }
    if(!focusFound) {
      browserTabs[0].focus();
    }

  };

  // Add an array of browserTabs to the current collection
  this.addTab = function( browserTab, startPosition ) {
    // Extract current set of tabs in collection
    var allTabs = [];

    for(var i = 0, l = this.length; i < l; i++) {
      allTabs[ i ] = this[ i ];
      if(allTabs[ i ].properties.active == true) {
        focusFound = true;
      }
    }

    if(browserTab.properties.active == true) {
      browserTab.focus();
    }

    var position = startPosition !== undefined ? startPosition : allTabs.length;

    // Add new browserTab to allTabs array
    allTabs.splice(this !== OEX.tabs ? position : this.length, 0, browserTab);

    // Rewrite the current tabs collection in order
    for( var i = 0, l = allTabs.length; i < l; i++ ) {
      if(this !== OEX.tabs) {
        // Update all tab indexes to the current tabs collection order
        allTabs[ i ].properties.index = i;
      }
      this[ i ] = allTabs[ i ];
    }
    this.length = allTabs.length;

  };

  // Remove a browserTab from the current collection
  this.removeTab = function( browserTab ) {

    var oldCollectionLength = this.length;

    // Extract current set of tabs in collection
    var allTabs = [];
    var removeTabIndex = -1;
    for(var i = 0, l = this.length; i < l; i++) {
      allTabs[ i ] = this[ i ];
      if( allTabs[ i ].id == browserTab.id ) {
        removeTabIndex = i;
      }
    }

    // Remove browser tab
    if(removeTabIndex > -1) {
      allTabs.splice(removeTabIndex, 1);
    }

    // Rewrite the current tabs collection
    for( var i = 0, l = allTabs.length; i < l; i++ ) {
      if(this !== OEX.tabs) {
        allTabs[ i ].properties.index = i;
      }
      this[ i ] = allTabs[ i ];
    }
    this.length = allTabs.length;

    // Remove any ghost items, if any
    if(oldCollectionLength > this.length) {
      for(var i = this.length, l = oldCollectionLength; i < l; i++) {
        delete this[ i ];
      }
    }

  };

};

BrowserTabManager.prototype = Object.create( OPromise.prototype );

BrowserTabManager.prototype.create = function( browserTabProperties, before ) {

  if(before && !(before instanceof BrowserTab)) {
    throw new OError(
      "TypeMismatchError",
      "Could not create BrowserTab object. 'before' attribute provided is invalid.",
      DOMException.TYPE_MISMATCH_ERR
    );
  } else if(before) {
    
    if( before.closed === true ) {
      throw new OError(
        "InvalidStateError",
        "'before' BrowserTab object is in the closed state and therefore is invalid.",
        DOMException.INVALID_STATE_ERR
      );
    }

    if(before._windowParent && before._windowParent.closed === true ) {
      throw new OError(
        "InvalidStateError",
        "Parent window of 'before' BrowserTab object is in the closed state and therefore is invalid.",
        DOMException.INVALID_STATE_ERR
      );
    }
    
    // If we're adding this BrowserTab before an existing object then set its insert position correctly
    browserTabProperties.position = before.properties.index;
    
  }

  // Set parent window to create the tab in
  var windowParent = before && before._windowParent ? before._windowParent : this._parent || OEX.windows.getLastFocused();
  
  if(windowParent && windowParent.closed === true ) {
    throw new OError(
      "InvalidStateError",
      "Parent window of the current BrowserTab object is in the closed state and therefore is invalid.",
      DOMException.INVALID_STATE_ERR
    );
  }

  var shadowBrowserTab = new BrowserTab( browserTabProperties, windowParent );

  // Sanitized tab properties
  var createTabProperties = {
    'url': shadowBrowserTab.properties.url,
    'active': shadowBrowserTab.properties.active,
    'pinned': shadowBrowserTab.properties.pinned,
    'index': shadowBrowserTab.properties.index
  };

  // Set insert position for the new tab from 'before' attribute, if any
  if( before ) {
    createTabProperties.windowId = before._windowParent ?
                                      before._windowParent.properties.id : createTabProperties.windowId;
  }

  // Add this object to the end of the current tabs collection
  shadowBrowserTab._windowParent.tabs.addTab(shadowBrowserTab, shadowBrowserTab.properties.index);

  // unfocus all other tabs in tab's window parent collection if this tab is set to focused
  if(shadowBrowserTab.properties.active == true ) {
    for(var i = 0, l = shadowBrowserTab._windowParent.tabs.length; i < l; i++) {
      if(shadowBrowserTab._windowParent.tabs[i] !== shadowBrowserTab) {
        shadowBrowserTab._windowParent.tabs[i].properties.active = false;
      }
    }
  }

  // Add this object to the root tab manager
  OEX.tabs.addTab( shadowBrowserTab );

  // Queue platform action or fire immediately if this object is resolved
  Queue.enqueue(this, function(done) {

    chrome.tabs.create(
      createTabProperties,
      function( _tab ) {
        // Update BrowserTab properties
        for(var i in _tab) {
          if(i == 'url') continue;
          shadowBrowserTab.properties[i] = _tab[i];
        }

        // Resolve new tab, if it hasn't been resolved already
        shadowBrowserTab.resolve(true);

        done();

      }.bind(this)
    );

  }.bind(this), true);

  // return shadowBrowserTab from this function before firing these events!
  global.setTimeout(function() {

    shadowBrowserTab._windowParent.tabs.dispatchEvent(new OEvent('create', {
      "tab": shadowBrowserTab,
      "prevWindow": null,
      "prevTabGroup": null,
      "prevPosition": 0
    }));

    // Fire a create event at RootTabsManager
    OEX.tabs.dispatchEvent(new OEvent('create', {
      "tab": shadowBrowserTab,
      "prevWindow": null,
      "prevTabGroup": null,
      "prevPosition": 0
    }));

  }, 50);

  return shadowBrowserTab;

};

BrowserTabManager.prototype.getAll = function() {

  var allTabs = [];

  for(var i = 0, l = this.length; i < l; i++) {
    allTabs[ i ] = this[ i ];
  }

  return allTabs;

};

BrowserTabManager.prototype.getSelected = function() {

  for(var i = 0, l = this.length; i < l; i++) {
    if(this[i].focused == true) {
      return this[i];
    }
  }

  // default
  if(this[0]) {
    this[0].properties.active = true;
  }

  return this[0] || undefined;

};
// Alias of .getSelected()
BrowserTabManager.prototype.getFocused = BrowserTabManager.prototype.getSelected;

BrowserTabManager.prototype.close = function( browserTab ) {

  if( !browserTab || !(browserTab instanceof BrowserTab)) {
    throw new OError(
      "TypeMismatchError",
      "Expected browserTab argument to be of type BrowserTab.",
      DOMException.TYPE_MISMATCH_ERR
    );
  }

  browserTab.close();

};
