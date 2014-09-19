// ==== matbox ====
// Copyright 2014 Mukunda Johnson

//-----------------------------------------------------------------------------
(function() { window.matbox = window.matbox || {};

matbox.Navbar = this;

var STATE_HIDDEN  = 0;
var STATE_FADEIN  = 1;
var STATE_ACTIVE  = 2;
var STATE_FADEOUT = 3;

var m_menu = null;
var m_new_menu = null;

//var m_active  = false;
//var m_options = null;
var m_state = STATE_HIDDEN;// = true;

var m_ag = AsyncGroup.Create();

/** ---------------------------------------------------------------------------
 * Callback when a button on the navbar is clicked.
 *
 * @param index Menu item index.
 */
function OnClick( index ) {
	// ignore clicks when the menu is hidden or fading out
	if( m_state != STATE_ACTIVE && 
		m_state != STATE_FADEIN ) return;
	
	m_menu[index].onclick();
}

/** ---------------------------------------------------------------------------
 * Check if two menu descriptors are the same.
 *
 * This only works if the menus are defined the exact same way.
 */
function CompareMenus( a, b ) {	
	return JSON.stringify(a) === JSON.stringify(b);
}

/** ---------------------------------------------------------------------------
 * Show the navigation menu
 *
 * @param menu [Optional] Menu descriptor. An array of menu item objects.
 *             If omitted, the last used menu will be shown.
 *             [ { caption: "unclickable item" }, 
 *               { caption: "clickable item", onclick="func()"}, ... ]
 *             this checks if the menu descriptor is the same before
 *             replacing the menu.
 */
function Show( menu ) { 
	
	var same = true;
	
	if( isSet( menu ) && menu != null ) {
		if( !CompareMenus( m_menu, menu ) ) {
			m_new_menu = menu;
			same = false;
		} else {
			m_new_menu = null;
			same = true;
		}
	}            
	              
	var nav = $( "#navigation" );                       
	       
	switch( m_state ) {       
	case STATE_HIDDEN: 
		// the bar is inactive, fade it in.
		nav.queue( ShowBar );
		m_state = STATE_FADEIN;
		break;
	case STATE_FADEIN:            
		// the bar is fading in, cancel the fade in only if the 
		// menu is different
		if( same ) break;
		m_ag.ClearAll();
		nav.clearQueue();
		nav.queue( HideBar );
		nav.queue( ShowBar );
		m_state = STATE_FADEOUT;
		break;
	case STATE_FADEOUT:      
		// the bar is fading out, cancel the fade if the 
		// new menu is the same as the current.
		// otherwise do a full reset
		m_ag.ClearAll();
		nav.clearQueue();
		if( same ) {
			nav.queue( ShowBar );
			m_state = STATE_FADEIN;
		} else {
			nav.queue( HideBar );
			nav.queue( ShowBar );
			m_state = STATE_FADEOUT;
		}
		break;
	case STATE_ACTIVE: 
		// the bar is active, full reset if the menu
		// is changing
		if( same ) break;
		nav.queue( HideBar );
		nav.queue( ShowBar );
		m_state = STATE_FADEOUT;
		break;
	}
}

/** ---------------------------------------------------------------------------
 * Hide the navigation menu.
 */
function Hide() {
	if( m_state == STATE_HIDDEN ) {
		// we are already hidden.
		return;
	} 
	
	m_ag.ClearAll();
	$( "#navigation" )
		.clearQueue()
		.queue( HideBar );
	m_state = STATE_FADEOUT;
}

//-----------------------------------------------------------------------------
function ShowBar( next ) { 
	m_state = STATE_FADEIN;
	if( m_menu == null && m_new_menu == null ) {
		m_new_menu = [];
	}
	
	var nav = $( "#navigation" );
	
	if( m_new_menu != null ) {
		var html = [];
		for( var i = 0; i < m_new_menu.length; i++ ) {
			
			if( m_new_menu[i].hasOwnProperty("onclick") ) {
				html.push( '<div class="tab clickable" onclick="matbox.Navbar.OnClick(', i, ')">' );
				html.push( m_new_menu[i].caption, '</div>' );
			} else {
				html.push( '<div class="tab caption">' );
				html.push( m_new_menu[i].caption, '</div>' );
			}
			
		}
		nav.html( html.join("") );
		m_menu = m_new_menu;
		m_new_menu = null;
	}
	
	nav.addClass( 'show' );
	m_ag.Set( 
		function() {
			m_state = STATE_ACTIVE;
			// the state here gets overwritten immediately if we are going
			// to fade out next
			next();
		}, 300 );
}

//-----------------------------------------------------------------------------
function HideBar( next ) {
	m_state = STATE_FADEOUT;
	$( "#navigation" ).removeClass('show');
	m_ag.Set( 
		function() {
			m_state = STATE_HIDDEN;
			next(); 
		}, 300 );
}

this.Show = Show;
this.Hide = Hide;
this.OnClick = OnClick;

})();
