(function() { 

/** ---------------------------------------------------------------------------
 * AsyncGroup class
 *
 * Handles grouping and cancelling of asynchronous methods.
 */
function AsyncGroup() {
	this.m_next_id = 0;
	this.m_handles = {}; 
	this.m_ajax = {};
}

/** ---------------------------------------------------------------------------
 * Set a new timeout.
 *
 * @param handler Timeout handler to call when the delay expires.
 * @param delay   Delay in milliseconds.
 * @return        ID of timeout, which can be used with Clear(...)
 */
AsyncGroup.prototype.Set = function( handler, delay ) {
	var id = ++this.m_next_id;
	
	var group = this;
	this.m_handles[id] = setTimeout( function() {
		delete group.m_handles[id];
		handler();
	}, delay );
	
	return id;
}

/** ---------------------------------------------------------------------------
 * Clear (cancel) a timeout.
 *
 * @param id ID returned from Set(...)
 * @return   true if the timeout was cancelled, false if the timeout already
 *           triggered or never existed.
 */
AsyncGroup.prototype.Clear = function( id ) {
	if( this.m_handles.hasOwnProperty( id ) ) {
		clearTimeout( this.m_handles[id] );
		delete this.m_handles[id];
		return true;
	}
	return false;
}

/** ---------------------------------------------------------------------------
 * Clear (cancel) all pending calls in this group.
 *
 * All IDs are invalidated.
 */
AsyncGroup.prototype.ClearAll = function() {
	for( var id in this.m_handles ) {
		clearTimeout( this.m_handles[id] );
    }
	this.m_handles = {};
	for( var id in this.m_ajax ) {
		this.m_ajax[id].ag_cancelled = true;
		this.m_ajax[id].abort();
    }
	this.m_ajax = {};
}

/** ---------------------------------------------------------------------------
 * Add an jQuery AJAX handle to this group.
 *
 * Any active handles added to the group will be aborted by CancelAll.
 *
 * Check for jqXHR.ag_cancelled in your failure handlers to determine if a
 * request was cancelled.
 *
 * @param handle jqXHR object.
 * @return       handle (for chaining)
 */
AsyncGroup.prototype.AddAjax = function( handle ) {
	var id = ++this.m_next_id;
	handle.ag_id = id;
	handle.ag_cancelled = false;
	this.m_ajax[id] = handle;
	
	handle.always( function() {
		RemoveAjax( handle );
	});
	
	return handle;
}

/** ---------------------------------------------------------------------------
 * Abort an AJAX request.
 *  
 * @param handle jqXHR handle, must be added with AddAjax first.
 * @return   true if the request was aborted, false if the request was already
 *           aborted. 
 */
AsyncGroup.prototype.CancelAjax = function( handle ) {
	if( handle.ag_cancelled == false ) {
		handle.ag_cancelled = true;
		handle.abort();
		return true;
	}
	return false;
}

/** ---------------------------------------------------------------------------
 * Remove an ajax handle from this group.
 *  
 * @param handle jqXHR handle
 * @return       true if the id was removed, false on failure.
 */
AsyncGroup.prototype.RemoveAjax = function( handle ) {
	if( !handle.hasOwnProperty( 'ag_id' ) ) return false;
	var id = handle.ag_id;
	if( this.m_ajax.hasOwnProperty( id ) ) {
		delete this.m_ajax[id];
		delete handle.ag_id;
		return true;
	}
	return false;
}

window.AsyncGroup = {};

/** ---------------------------------------------------------------------------
 * [global] Create a new AsyncGroup.
 *
 * @return New AsyncGroup.
 */
window.AsyncGroup.Create = function() {
	return new AsyncGroup();
}


})();
