/*!
 * oauth2.js v0.2.2
 * Copyright 2013, Hannes Moser (@eliias)
 */
define(['jquery', 'underscore', 'backbone', 'eventaggr'], function ($, _, Backbone, ventAggr) {


    /**
     * The interval between two checks if token expires
     * Default value is 60000 ms = 1 minute
     *
     * @type Number Time in ms
     */
    var AUTO_REFRESH_TIME = 60000;

    /**
     * The maximum time before an access_token must be renewed
     * Default value is 600000ms = 10 minutes
     *
     * @type Number Time in ms
     */
    var REFRESH_MAX_TIME = 600000;

 
    /**
     * Backbone.OAuth2 object
     *
     * @type Backbone.OAuth2
     */
    var OAuth2 = Backbone.OAuth2 = function(opts) {

        /**
         * Extend defaults with options
         * @type {*|void}
         */
        options = _.extend({
            tokenEndPointUrl   : 'https://api.tld/v2/oauth/access',
            
            autoRefresh : true
        }, opts);
        
        if (options.tokenEndPointUrl)      this.tokenEndPointUrl = options.tokenEndPointUrl;
        if (options.grantType)      this.grantType = options.grantType;
        if (options.clientId)       this.clientId = options.clientId;
        if (options.clientSecret)   this.clientSecret = options.clientSecret;

       
        storage = {
            setItem: function() {
                console.info('backbone.oauth2: Localstorage not available: save failed');
            },
            removeItem: function() {
                console.info('backbone.oauth2: Localstorage not available: removal failed');
            }
        }


        /**
         * Set current state object to null. This object is later used to
         * store the last response object from either an valid or invalid
         * authentication attempt.
         *
         * Example:
         * {
         *   "access_token": "52d8670532483516dbe1dfc55d3de2b148b63995",
         *   "expires_in": "2419200",
         *   "token_type": "bearer",
         *   "scope": null,
         *   "time": null,
         *   "refresh_token": "be4b157c57bfbd79f0183b9ebd7879326d080ad8"
         * }
         *
         * @type {object}
         */
        this.state = {
        	tokenEndPointUrl: null,
            token_type: null,
            expires_in: null,
            scope: null,
            time: null
        };
        this.load();

        /**
         * If autorefresh is enabled, check expiration date of access_token
         * every second.
         */
        if (options.autoRefresh) {
            var self = this;
            var triggerRefresh = function myself (auth) {
                if (self.isAuthenticated()) {
                    if (self.expiresIn() < REFRESH_MAX_TIME) {
                        console.info('A new access-token/refresh-token has been requested.');
                        auth.refresh();
                    }
                    setTimeout(triggerRefresh, AUTO_REFRESH_TIME, auth);
                }
            };
            setTimeout(triggerRefresh, AUTO_REFRESH_TIME, self);
        }

        /*
         * Invoke initialize method
         */
        this.initialize.apply(this, arguments);
    };

    /**
     * Setup all inheritable <strong>Backbone.OAuth2</strong> properties and methods.
     */
    _.extend(OAuth2.prototype, Backbone.Events, {
        /**
         * Initialize is an empty function by default. Override it with your
         * own initialization logic.
         *
         * @returns {void}
         */
        initialize: function () {
        },

        /**
         * Verify if the current state is "authenticated".
         *
         * @returns {Boolean}
         */
        isAuthenticated: function () {
            // Always load
            this.load();

            // Check for expired access_token
            var time = new Date().getTime();

            if (typeof this.state !== 'undefined' && this.state !== null) {
                // Check if token has already expired
                if (this.state.expires_in + this.state.time > time) {
                    return true;
                } else {
                	 console.info('backbone.oauth2: token expired');
                }
            }

            return false;
        },

        /**
         * Get epxiration time for the access-token. This method should be used to
         * request a new access-token after ~50% of the access-token lifetime.
         * This method always returns a positive integer or 0 if not authenticated.
         *
         * @returns {int} Seconds until access-token will be expired
         */
        expiresIn: function () {
            if (this.isAuthenticated()) {
                var time = new Date().getTime();
                return (this.state.time + this.state.expires_in) - time;
            }
            return 0;
        },

        /**
         * Capitalizes a given string in order to return the correct name for the
         * token type.
         *
         * @param {string} str
         * @returns {string}
         */
        getNormalizedTokenType: function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },

        /**
         * Returns the full authorization header
         *
         * @returns {object}
         */
        getAuthorizationHeader: function () {
            if (this.isAuthenticated()) {
                return {
                    'Authorization': this.getNormalizedTokenType(this.state.token_type) + ' ' + this.state.access_token
                };
            }
        },

        /**
         * Get value for STORAGE_KEY from localStorage
         *
         * @returns {object,boolean}
         */
        load: function () {
            return this.state;
        },

        /**
         * Save state with STORAGE_KEY to localStorage
         *
         * @param {object} state
         * @returns {void}
         */
        save: function (state) {
            this.state = state;
        },

        /**
         * Clear value assigned to STORAGE_KEY from localStorage
         *
         * @returns {void}
         */
        clear: function () {
            this.state = null;
        },

        /**
         * Authenticate
         *
         * @returns {void}
         */
        auth: function () {
            if (this.isAuthenticated()) {
                return ventAggr.trigger('oauth2:access', this.state, this);
            }
            ventAggr.trigger('oauth2:error', this.state, this);
        },

        /**
         * Authenticates against an OAuth2 endpoint
         *
         * @param {string} username
         * @param {string} password
         * @returns {void}
         */
        access: function (username, password) {
            // Store a reference to the object
            var self = this;

            // Check if we have already authenticated
            if (this.isAuthenticated()) {
                return ventAggr.trigger('success', this.state, this);
            }

            /*
             * Save time before request to avoid race conditions with expiration timestamps
             */
            var time = new Date().getTime();

            // Request a new access-token/refresh-token
            $.ajax({
                url: self.tokenEndPointUrl,
                type: 'POST',
                data: {
                    grant_type      : 'password',
                    client_id       : self.clientId,
                    username        : username,
                    password        : password,
                    scope			: 'owner'
                },
                dataType: 'json',

                /**
                 * Success event, triggered on every successfull
                 * authentication attempt.
                 *
                 * @param {object} response
                 * @returns {void}
                 */
                success: function (response) {
                    /*
                     * Extend response object with current time
                     */
                    response.time = time;

                    // Cast expires_in to Int and multiply by 1000 to get ms
                    response.expires_in = parseInt(response.expires_in) * 1000;

                    // Store to localStorage too(to avoid double authentication calls)
                    //self.save(response, response.expires_in - timediff);
                    self.save(response);
                    ventAggr.trigger('oauth2:access', response, this);
                },

                /**
                 * Error event, triggered on every failed authentication attempt.
                 *
                 * @param {object} response
                 * @returns {void}
                 */
                error: function (response) {
                	ventAggr.trigger('oauth2:error', response, this);
                }
            });
        },

        /**
         * Request a new access_token and request_token by sending a valid
         * refresh_token
         *
         * @returns {void}
         */
        refresh: function () {
            // Store a reference to the object
            var self = this;

            // Load
            if (this.isAuthenticated()) {
            	ventAggr.trigger('error', 'No authentication data found, please use the access method first.', this);
            }

            /*
             * Save time before request to avoid race conditions with expiration
             * timestamps
             */
            var time = new Date().getTime();

            // Request a new access-token/refresh-token
            $.ajax({
                url: self.tokenEndPointUrl,
                type: 'POST',
                dataType: 'json',
                data: {
                    grant_type      : 'refresh_token',
                    client_id       : self.clientId,
                    refresh_token   : self.state.refresh_token,
                    scope			: 'owner'
                },

                /**
                 * Success event, triggered on every successfull
                 * authentication attempt.
                 *
                 * @param {object} response
                 * @returns {void}
                 */
                success: function (response) {
                    /*
                     * Extend response object with current time
                     * Get timediff before and after request for localStorage
                     */
                    response.time = time;

                    // Cast expires_in to Int and multiply by 1000 to get ms
                    response.expires_in = parseInt(response.expires_in) * 1000;

                    // Store to localStorage too(faster access)
                    //self.save(response, response.expires_in - timediff);
                    self.save(response);
                    ventAggr.trigger('oauth2:refresh', response, this);
                },

                /**
                 * Error event, triggered on every failed authentication attempt.
                 *
                 * @param {object} response
                 * @returns {void}
                 */
                error: function (response) {
                	ventAggr.trigger('oauth2:error', response, this);
                }
            });
        },

        /**
         * Revoke OAuth2 access if a valid token exists and clears related
         * properties (access_token, refresh_token)
         *
         * @returns {void}
         */
        revoke: function () {
            // Store a reference to the object
            var self = this;

            /*
             * If we are not authenticated, just clear state property
             */
            if (!this.isAuthenticated()) {
                self.clear();
                return ventAggr.trigger('revoke', null, this);
            }

            // Build header
            var accessToken = this.state.access_token;

            // Request a new access-token/refresh-token
            $.ajax({
                url: self.revokeUrl,
                type: 'POST',
                dataType: 'text', // Force text, maybe someone tries to be cool and set application/json with no content
                data: {
                    token           : accessToken,
                    token_type_hint : 'access_token',
                    client_id       : self.clientId,
                    scope			: 'owner'
                },

                /**
                 * Success event, triggered on every successfull
                 * revokation attempt.
                 *
                 * @param {object} response
                 * @returns {void}
                 */
                success: function (response) {
                    self.clear();
                    ventAggr.trigger('oauth2:revoke', response, this);
                },

                /**
                 * Error event, triggered on every failed authentication attempt.
                 *
                 * @param {object} xhr
                 * @param {object} ajaxOptions
                 * @param {object} thrownError
                 * @returns {void}
                 */
                error: function (xhr, ajaxOptions, thrownError) {
                	ventAggr.trigger('oauth2:error', xhr, this);
                }
            });
        }
    });

    var oauth2 = new Backbone.OAuth2({tokenEndPointUrl: window.location.protocol + '//' +  window.location.hostname + (window.location.port ? (':' + window.location.port) : '') + '/obix/oauth/token'});
    return oauth2;
});
