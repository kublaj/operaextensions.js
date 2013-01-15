opera.isReady(function(){
    var timer = null, counter = 0;
    var theButton;
    var colors = ["blue", "red", "green", "yellow", "pink", "magenta", "black"];
    window.addEventListener("load", function(){
        var UIItemProperties = {
          disabled: false,
          title: "007 - createItem color name",
          icon: "oex/icon.png",
          onclick: function(){
            if( timer ){
              window.clearInterval( timer );
              timer = null;
            } else {
              timer = window.setInterval( function(){
                  var newColor = colors[counter];//[0x50 + counter, 0xff, 0xff - counter, 0x33];//"#FFFFFF"
                  MANUAL( "Changing theButton.badge.color to " + newColor );
                  theButton.badge.color = newColor;
                  counter++;
                  if( counter==colors.length ){counter = 0;}
              }, 500);
            }
          },
          badge: {
            textContent: 'Description',
            backgroundColor: '#ffeedd',
            color: '#404040',
            display: 'hidden'
          }
        }
        theButton = opera.contexts.toolbar.createItem( UIItemProperties );
        opera.contexts.toolbar.addItem( theButton );
        MANUAL( "If there is an enabled button with a title and favicon, click the button to change badge.color" );
    }, false);
});