// ==== matbox ====
// Copyright 2014 Mukunda Johnson

(function() { window.matbox = window.matbox || {};

// Loader
// module for loading pages in place

// TODO queue next page load for history operations

matbox.Loader = this;

var FADE_OUT_TIME = 500; // not the actual fadeout time (set in css)
var FADE_IN_TIME = 500;  // only used to control timeout delays

var m_loading = false;  // loading is set while a new page is being loaded
						// this includes the time between the call to Load
						// until the loaded content is initialized and
						// fading in
						
var m_fading_out = false;  // used to coordinate fadeout and ajax result
var m_page_content = null; //

var m_ag = AsyncGroup.Create();

var m_icontimeout = AsyncGroup.Create();

// error content when the ajax fails:
var PAGE_LOAD_FAILED_CONTENT = 
	'<div class="topic nothing" id="topic">'+
		'something messed up.'+
	'</div><!-- (the page failed to load.) -->';
	 
/** ---------------------------------------------------------------------------
 * Set the page content and fade in.
 *
 * @param content Content to insert into #content.
 *
 */
function FadeIn( content ) {
	HideLoadingIcon();
	$(window).scrollTop(0);
	
	// global initialization here:
	matbox.InitializePreLoad();
	
	output = $('#content');
	$('#content').html( content );
	matbox.InitializePostLoad();
	m_loading = false;
	
	matbox.AdjustSize();
	$(window).scrollTop(0);
	output.css( 'opacity', 1 ); // fade in
}

//-----------------------------------------------------------------------------
function ShowLoadingIcon() {
	m_icontimeout.ClearAll();
	$("#loader_window").removeClass( "hidden" );
	m_icontimeout.Set( function() {
		$("#loader_window").addClass( "fadein" );
	},100);
	
}

//-----------------------------------------------------------------------------
function HideLoadingIcon() {
	m_icontimeout.ClearAll();
	$("#loader_window").removeClass( "fadein" );
	m_icontimeout.Set( function() {
		$("#loader_window").addClass( "hidden" );
	}, 1000 );
}

/** ---------------------------------------------------------------------------
 * Load a content page.
 *
 * @param url URL of page to load.
 * @param delay Used to control the Extra Dramatic Break Effect.
 *              negated values are treated as negated absolute values
 *              positive values are added to the normal fade constant
 */
this.Load = function( url, delay, get ) {
	if( m_loading ) return;
	
	matbox.ResetIdleTime();

	if( !isSet(get) ) get = {};
	if( !isSet(delay) ) delay = 500;
	if( delay < 0 ) delay = -delay - FADE_OUT_TIME; 
	
	m_loading = true;
	
	matbox.LiveRefresh.Reset(); 
	
	output = $( '#content' );
	output.css( 'opacity', 0 ); // fade out
	
	m_fading_out = true;
	
	m_icontimeout.Set( ShowLoadingIcon, 2000 );
	
	// whichever one of these finishes first (fadeout/ajax)
	// thats the one that sets the content and fades in
	m_ag.Set( 
		function() {
			m_fading_out = false; 
			if( m_page_content != null ) {
				FadeIn( m_page_content );
				m_page_content = null;
			} else {
				// we finished first, prime the output.
				output.html("");
			}
		}, FADE_OUT_TIME+delay );
	
	m_ag.AddAjax( $.get( url, get ) )
		.done( function(data) {
			
			if( m_fading_out ) {
				m_page_content = data;
			} else {
				FadeIn( data );
				
			}
		})
		.fail( function( handle ) {
			if( handle.ag_cancelled ) return;
			
			if( m_fading_out ) {
				m_page_content = PAGE_LOAD_FAILED_CONTENT;
			} else {
				FadeIn( PAGE_LOAD_FAILED_CONTENT );
			}
		});
	
}

/** ---------------------------------------------------------------------------
 * Same as Load, but cancel an existing load first.
 *
 */
this.ForceLoad = function( url, delay, get ) {
	if( m_loading ) {
		
		m_ag.ClearAll();
		m_loading = false;
	}
	Load( url, delay, get );
}

/** ---------------------------------------------------------------------------
 * Reload content.php
 */
this.RefreshContent = function() {
	this.Load( 'content.php' );
}

/** ---------------------------------------------------------------------------
 * Check if a page is loading
 *
 * @return true if the page is fading out or otherwise busy loading.
 */
this.IsLoading = function() {
	return m_loading;
}

/** ---------------------------------------------------------------------------
 * Set the loading flag, to freeze the page for an imminent pageload. 
 */
this.SetLoading = function() {
	m_loading = true;
}

/** ---------------------------------------------------------------------------
 * Cancel any page load in progress.
 */
this.Cancel = function() {
}

})();
