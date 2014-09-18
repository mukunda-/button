// ==== matbox ====
// Copyright 2014 Mukunda Johnson

//-----------------------------------------------------------------------------
(function() { window.matbox = window.matbox || {};

matbox.Navbar = this;

var m_active = false;
var m_options = null;
var m_hidden = true;

var m_ag = AsyncGroup.Create();

//-----------------------------------------------------------------------------
function Show( options ) { 
	m_active = false;
	if( isSet( options ) ) m_options = options;
	
	m_ag.ClearAll();
	var nav = $( "#navigation" );
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
