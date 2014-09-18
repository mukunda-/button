// ==== matbox ====
// Copyright 2014 Mukunda Johnson

//-----------------------------------------------------------------------------
(function() { window.matbox = window.matbox || {};

matbox.Navbar = this;

var m_active = false;
var m_options = null;

//-----------------------------------------------------------------------------
function Show( options ) { 
	m_active = false;
	if( isSet( options ) ) m_options = options;
	
	$("#navigation")
		.clearQueue()
		.queue( HideBar )
		.delay( 1500 )
		.queue( ShowBar )
		.delay( 500 );
}

//-----------------------------------------------------------------------------
function Hide() {
	m_active = false;
	$("#navigation")
		.clearQueue()
		.removeClass('show');
}

//-----------------------------------------------------------------------------
function ShowBar( next ) { 
	if( m_options == null ) next();

	var html = [];
	for( var i = 0; i < m_options.length; i++ ) {
		
		html.push( '<div class="tab" onclick="', m_options[i].onclick, '">' );
		html.push( m_options[i].caption, '</div>' );
		
	}
	
	m_active = true;
	$("#navigation")
		.html( html.join("") )
		.addClass( 'show' );

	next();
}

//-----------------------------------------------------------------------------
function HideBar( next ) {
	m_active = false; 
	$("#navigation").removeClass('show');
	next();
}

this.Show = Show;
this.Hide = Hide;

})();