// ==== matbox ====
// Copyright 2014 Mukunda Johnson

//-----------------------------------------------------------------------------
(function() { window.matbox = window.matbox || {};

matbox.Navbar = this;

var STATE_HIDDEN  = 0;
var STATE_FADEIN  = 1;
var STATE_ACTIVE  = 2;
var STATE_FADEOUT = 3;

var m_options = {};
var m_new_options = {};
var m_options_dirty = false;
var m_title;
var m_title_dirty = false;

//var m_active  = false;
//var m_options = null;
var m_state = STATE_HIDDEN;// = true;

var m_ag = AsyncGroup.Create();

//-----------------------------------------------------------------------------
function CompareOptions( a, b ) {	
	return JSON.stringify(a) === JSON.stringify(b);
}

//-----------------------------------------------------------------------------
function Show( title, options ) { 
	m_active = false;
	
	var same = true;
	
	if( isSet( options ) && options != null ) {
		if( !CompareOptions( m_options, options ) ) {
			m_new_options = options;
			m_options_dirty = true;
			same = false;
		}
	}
	
	if( isSet( title ) && title != null ) {
		if( title != m_title ) {
			m_title = title;
			m_title_dirty = true;
			same = false;
		}
	}
	
	var nav = $( "#navigation" );
	
	switch( m_state ) {
	case STATE_HIDDEN:
		m_ag.ClearAll();
		nav.clearQueue();
	case STATE_FADEIN:
	case STATE_FADEOUT:
	case STATE_ACTIVE:
		
	}
	
	m_ag.ClearAll();
	
	nav.clearQueue();
	if( !m_hidden ) {
		nav.queue( HideBar );
	}
	nav.queue( ShowBar );
}

//-----------------------------------------------------------------------------
function Hide() {
	m_active = false;
	
	m_ag.ClearAll();
	$( "#navigation" )
		.clearQueue()
		.queue( HideBar );
}

//-----------------------------------------------------------------------------
function ShowBar( next ) { 
	if( m_options == null ) next();
	m_hidden = false;
	
	var html = [];
	for( var i = 0; i < m_options.length; i++ ) {
		
		html.push( '<div class="tab" onclick="', m_options[i].onclick, '">' );
		html.push( m_options[i].caption, '</div>' );
		
	}
	
	m_active = true;
	$( "#navigation" )
		.html( html.join("") )
		.addClass( 'show' );

	m_ag.Set( next, 500 );
}

//-----------------------------------------------------------------------------
function HideBar( next ) {
	m_active = false; 
	$( "#navigation" ).removeClass('show');
	m_ag.Set( function() {
		m_hidden = true;
		next(); }, 500 );
}

this.Show = Show;
this.Hide = Hide;

})();
