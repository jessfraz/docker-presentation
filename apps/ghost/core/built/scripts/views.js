/*global window, document, setTimeout, Ghost, $, _, Backbone, JST, shortcut */
(function () {
    "use strict";

    Ghost.TemplateView = Backbone.View.extend({
        templateName: "widget",

        template: function (data) {
            return JST[this.templateName](data);
        },

        templateData: function () {
            if (this.model) {
                return this.model.toJSON();
            }

            if (this.collection) {
                return this.collection.toJSON();
            }

            return {};
        },

        render: function () {
            if (_.isFunction(this.beforeRender)) {
                this.beforeRender();
            }

            this.$el.html(this.template(this.templateData()));

            if (_.isFunction(this.afterRender)) {
                this.afterRender();
            }

            return this;
        }
    });

    Ghost.View = Ghost.TemplateView.extend({

        // Adds a subview to the current view, which will
        // ensure its removal when this view is removed,
        // or when view.removeSubviews is called
        addSubview: function (view) {
            if (!(view instanceof Backbone.View)) {
                throw new Error("Subview must be a Backbone.View");
            }
            this.subviews = this.subviews || [];
            this.subviews.push(view);
            return view;
        },

        // Removes any subviews associated with this view
        // by `addSubview`, which will in-turn remove any
        // children of those views, and so on.
        removeSubviews: function () {
            var children = this.subviews;

            if (!children) {
                return this;
            }

            _(children).invoke("remove");

            this.subviews = [];
            return this;
        },

        // Extends the view's remove, by calling `removeSubviews`
        // if any subviews exist.
        remove: function () {
            if (this.subviews) {
                this.removeSubviews();
            }
            return Backbone.View.prototype.remove.apply(this, arguments);
        }
    });

    Ghost.Views.Utils = {

        // Used in API request fail handlers to parse a standard api error
        // response json for the message to display
        getRequestErrorMessage: function (request) {
            var message,
                msgDetail;

            // Can't really continue without a request
            if (!request) {
                return null;
            }

            // Seems like a sensible default
            message = request.statusText;

            // If a non 200 response
            if (request.status !== 200) {
                try {
                    // Try to parse out the error, or default to "Unknown"
                    message =  request.responseJSON.error || "Unknown Error";
                } catch (e) {
                    msgDetail = request.status ? request.status + " - " + request.statusText : "Server was not available";
                    message = "The server returned an error (" + msgDetail + ").";
                }
            }

            return message;
        },

        // Getting URL vars
        getUrlVariables: function () {
            var vars = [],
                hash,
                hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&'),
                i;

            for (i = 0; i < hashes.length; i += 1) {
                hash = hashes[i].split('=');
                vars.push(hash[0]);
                vars[hash[0]] = hash[1];
            }
            return vars;
        }
    };

    /**
     * This is the view to generate the markup for the individual
     * notification. Will be included into #notifications.
     *
     * States can be
     * - persistent
     * - passive
     *
     * Types can be
     * - error
     * - success
     * - alert
     * -   (empty)
     *
     */
    Ghost.Views.Notification = Ghost.View.extend({
        templateName: 'notification',
        className: 'js-bb-notification',
        template: function (data) {
            return JST[this.templateName](data);
        },
        render: function () {
            var html = this.template(this.model);
            this.$el.html(html);
            return this;
        }
    });

    /**
     * This handles Notification groups
     */
    Ghost.Views.NotificationCollection = Ghost.View.extend({
        el: '#notifications',
        initialize: function () {
            var self = this;
            this.render();
            Ghost.on('urlchange', function () {
                self.clearEverything();
            });
            shortcut.add("ESC", function () {
                // Make sure there isn't currently an open modal, as the escape key should close that first.
                // This is a temporary solution to enable closing extra-long notifications, and should be refactored
                // into something more robust in future
                if ($('.js-modal').length < 1) {
                    self.clearEverything();
                }
            });
        },
        events: {
            'animationend .js-notification': 'removeItem',
            'webkitAnimationEnd .js-notification': 'removeItem',
            'oanimationend .js-notification': 'removeItem',
            'MSAnimationEnd .js-notification': 'removeItem',
            'click .js-notification.notification-passive .close': 'closePassive',
            'click .js-notification.notification-persistent .close': 'closePersistent'
        },
        render: function () {
            _.each(this.model, function (item) {
                this.renderItem(item);
            }, this);
        },
        renderItem: function (item) {
            var itemView = new Ghost.Views.Notification({ model: item }),
                height,
                $notification = $(itemView.render().el);

            this.$el.append($notification);
            height = $notification.hide().outerHeight(true);
            $notification.animate({height: height}, 250, function () {
                $(this)
                    .css({height: "auto"})
                    .fadeIn(250);
            });
        },
        addItem: function (item) {
            this.model.push(item);
            this.renderItem(item);
        },
        clearEverything: function () {
            this.$el.find('.js-notification.notification-passive').parent().remove();
        },
        removeItem: function (e) {
            e.preventDefault();
            var self = e.currentTarget,
                bbSelf = this;
            if (self.className.indexOf('notification-persistent') !== -1) {
                $.ajax({
                    type: "DELETE",
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
                    url: Ghost.paths.apiRoot + '/notifications/' + $(self).find('.close').data('id')
                }).done(function (result) {
                    /*jslint unparam:true*/
                    bbSelf.$el.slideUp(250, function () {
                        $(this).show().css({height: "auto"});
                        $(self).remove();
                    });
                });
            } else {
                $(self).slideUp(250, function () {
                    $(this)
                        .show()
                        .css({height: "auto"})
                        .parent()
                        .remove();
                });
            }
        },
        closePassive: function (e) {
            $(e.currentTarget)
                .parent()
                .fadeOut(250)
                .slideUp(250, function () {
                    $(this).remove();
                });
        },
        closePersistent: function (e) {
            var self = e.currentTarget,
                bbSelf = this;
            $.ajax({
                type: "DELETE",
                headers: {
                    'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                },
                url: Ghost.paths.apiRoot + '/notifications/' + $(self).data('id')
            }).done(function (result) {
                /*jslint unparam:true*/
                var height = bbSelf.$('.js-notification').outerHeight(true),
                    $parent = $(self).parent();
                bbSelf.$el.css({height: height});

                if ($parent.parent().hasClass('js-bb-notification')) {
                    $parent.parent().fadeOut(200,  function () {
                        $(this).remove();
                        bbSelf.$el.slideUp(250, function () {
                            $(this).show().css({height: "auto"});
                        });
                    });
                } else {
                    $parent.fadeOut(200,  function () {
                        $(this).remove();
                        bbSelf.$el.slideUp(250, function () {
                            $(this).show().css({height: "auto"});
                        });
                    });
                }
            });
        }
    });

    // ## Modals
    Ghost.Views.Modal = Ghost.View.extend({
        el: '#modal-container',
        templateName: 'modal',
        className: 'js-bb-modal',
        // Render and manages modal dismissal
        initialize: function () {
            this.render();
            var self = this;
            if (this.model.options.close) {
                shortcut.add("ESC", function () {
                    self.removeElement();
                });
                $(document).on('click', '.modal-background', function () {
                    self.removeElement();
                });
            } else {
                shortcut.remove("ESC");
                $(document).off('click', '.modal-background');
            }

            if (this.model.options.confirm) {
                // Initiate functions for buttons here so models don't get tied up.
                this.acceptModal = function () {
                    this.model.options.confirm.accept.func.call(this);
                    self.removeElement();
                };
                this.rejectModal = function () {
                    this.model.options.confirm.reject.func.call(this);
                    self.removeElement();
                };
            }
        },
        templateData: function () {
            return this.model;
        },
        events: {
            'click .close': 'removeElement',
            'click .js-button-accept': 'acceptModal',
            'click .js-button-reject': 'rejectModal'
        },
        afterRender: function () {
            this.$el.fadeIn(50);
            $(".modal-background").fadeIn(10, function () {
                $(this).addClass("in");
            });
            if (this.model.options.confirm) {
                this.$('.close').remove();
            }
            this.$(".modal-body").html(this.addSubview(new Ghost.Views.Modal.ContentView({model: this.model})).render().el);

//            if (document.body.style.webkitFilter !== undefined) { // Detect webkit filters
//                $("body").addClass("blur"); // Removed due to poor performance in Chrome
//            }

            if (_.isFunction(this.model.options.afterRender)) {
                this.model.options.afterRender.call(this);
            }
            if (this.model.options.animation) {
                this.animate(this.$el.children(".js-modal"));
            }
        },
        // #### remove
        // Removes Backbone attachments from modals
        remove: function () {
            this.undelegateEvents();
            this.$el.empty();
            this.stopListening();
            return this;
        },
        // #### removeElement
        // Visually removes the modal from the user interface
        removeElement: function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            var self = this,
                $jsModal = $('.js-modal'),
                removeModalDelay = $jsModal.transitionDuration(),
                removeBackgroundDelay = self.$el.transitionDuration();

            $jsModal.removeClass('in');

            if (!this.model.options.animation) {
                removeModalDelay = removeBackgroundDelay = 0;
            }

            setTimeout(function () {

                if (document.body.style.filter !== undefined) {
                    $("body").removeClass("blur");
                }
                $(".modal-background").removeClass('in');

                setTimeout(function () {
                    self.remove();
                    self.$el.hide();
                    $(".modal-background").hide();
                }, removeBackgroundDelay);
            }, removeModalDelay);

        },
        // #### animate
        // Animates the animation
        animate: function (target) {
            setTimeout(function () {
                target.addClass('in');
            }, target.transitionDuration());
        }
    });

    // ## Modal Content
    Ghost.Views.Modal.ContentView = Ghost.View.extend({

        template: function (data) {
            return JST['modals/' + this.model.content.template](data);
        },
        templateData: function () {
            return this.model;
        }

    });
}());

/*global window, document, Ghost, $, _, Backbone, JST, NProgress */
(function () {
    "use strict";

    var ContentList,
        ContentItem,
        PreviewContainer;

    // Base view
    // ----------
    Ghost.Views.Blog = Ghost.View.extend({
        initialize: function (options) {
            /*jslint unparam:true*/
            var self = this,
                finishProgress = function () {
                    NProgress.done();
                };

            // Basic collection request/sync flow progress bar handlers
            this.listenTo(this.collection, 'request', function () {
                NProgress.start();
            });
            this.listenTo(this.collection, 'sync', finishProgress);

            // A special case because models that are destroyed are removed from the
            // collection before the sync event fires and bubbles up
            this.listenTo(this.collection, 'destroy', function (model) {
                self.listenToOnce(model, 'sync', finishProgress);
            });

            this.addSubview(new PreviewContainer({ el: '.js-content-preview', collection: this.collection })).render();
            this.addSubview(new ContentList({ el: '.js-content-list', collection: this.collection })).render();
        }
    });


    // Content list (sidebar)
    // -----------------------
    ContentList = Ghost.View.extend({

        isLoading: false,

        events: {
            'click .content-list-content'    : 'scrollHandler'
        },

        initialize: function () {
            this.$('.content-list-content').scrollClass({target: '.content-list', offset: 10});
            this.listenTo(this.collection, 'remove', this.showNext);
            this.listenTo(this.collection, 'add', this.renderPost);
            // Can't use backbone event bind (see: http://stackoverflow.com/questions/13480843/backbone-scroll-event-not-firing)
            this.$('.content-list-content').scroll($.proxy(this.checkScroll, this));
        },

        showNext: function () {
            if (this.isLoading) { return; }

            if (!this.collection.length) {
                return Backbone.trigger('blog:activeItem', null);
            }

            var id = this.collection.at(0) ? this.collection.at(0).id : false;
            if (id) {
                Backbone.trigger('blog:activeItem', id);
            }
        },

        reportLoadError: function (response) {
            var message = 'A problem was encountered while loading more posts';

            if (response) {
                // Get message from response
                message += '; ' + Ghost.Views.Utils.getRequestErrorMessage(response);
            } else {
                message += '.';
            }

            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        },

        checkScroll: function (event) {
            var self = this,
                element = event.target,
                triggerPoint = 100;

            // If we haven't passed our threshold, exit
            if (this.isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
                return;
            }

            // If we've loaded the max number of pages, exit
            if (this.collection.currentPage >=  this.collection.totalPages) {
                return;
            }

            // Load moar posts!
            this.isLoading = true;
            this.collection.fetch({
                update: true,
                remove: false,
                data: {
                    status: 'all',
                    page: (self.collection.currentPage + 1),
                    staticPages: 'all'
                }
            }).then(function onSuccess(response) {
                /*jslint unparam:true*/
                self.render();
                self.isLoading = false;
            }, function onError(e) {
                self.reportLoadError(e);
            });
        },

        renderPost: function (model) {
            this.$('ol').append(this.addSubview(new ContentItem({model: model})).render().el);
        },

        render: function () {
            var $list = this.$('ol');

            // Clear out any pre-existing subviews.
            this.removeSubviews();

            this.collection.each(function (model) {
                $list.append(this.addSubview(new ContentItem({model: model})).render().el);
            }, this);
            this.showNext();
        }

    });

    // Content Item
    // -----------------------
    ContentItem = Ghost.View.extend({

        tagName: 'li',

        events: {
            'click a': 'setActiveItem'
        },

        active: false,

        initialize: function () {
            this.listenTo(Backbone, 'blog:activeItem', this.checkActive);
            this.listenTo(this.model, 'change:page change:featured', this.render);
            this.listenTo(this.model, 'destroy', this.removeItem);
        },

        removeItem: function () {
            var self = this;
            $.when(this.$el.slideUp()).then(function () {
                self.remove();
            });
        },

        // If the current item isn't active, we trigger the event to
        // notify a change in which item we're viewing.
        setActiveItem: function (e) {
            e.preventDefault();
            if (this.active !== true) {
                Backbone.trigger('blog:activeItem', this.model.id);
                this.render();
            }
        },

        // Checks whether this item is active and doesn't match the current id.
        checkActive: function (id) {
            if (this.model.id !== id) {
                if (this.active) {
                    this.active = false;
                    this.$el.removeClass('active');
                    this.render();
                }
            } else {
                this.active = true;
                this.$el.addClass('active');
            }
        },

        showPreview: function (e) {
            var item = $(e.currentTarget);
            this.$('.content-list-content li').removeClass('active');
            item.addClass('active');
            Backbone.trigger('blog:activeItem', item.data('id'));
        },

        templateName: "list-item",

        templateData: function () {
            return _.extend({active: this.active}, this.model.toJSON());
        }
    });

    // Content preview
    // ----------------
    PreviewContainer = Ghost.View.extend({

        activeId: null,

        events: {
            'click .post-controls .post-edit' : 'editPost',
            'click .featured' : 'toggleFeatured',
            'click .unfeatured' : 'toggleFeatured'
        },

        initialize: function () {
            this.listenTo(Backbone, 'blog:activeItem', this.setActivePreview);
        },

        setActivePreview: function (id) {
            if (this.activeId !== id) {
                this.activeId = id;
                this.render();
            }
        },

        editPost: function (e) {
            e.preventDefault();
            // for now this will disable "open in new tab", but when we have a Router implemented
            // it can go back to being a normal link to '#/ghost/editor/X'
            window.location = Ghost.paths.subdir + '/ghost/editor/' + this.model.get('id') + '/';
        },

        toggleFeatured: function (e) {
            var self = this,
                featured = !self.model.get('featured'),
                featuredEl = $(e.currentTarget),
                model = this.collection.get(this.activeId);

            model.save({
                featured: featured
            }, {
                success : function () {
                    featuredEl.removeClass("featured unfeatured").addClass(featured ? "featured" : "unfeatured");
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Post successfully marked as " + (featured ? "featured" : "not featured") + ".",
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jslint unparam:true*/
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        },

        templateName: "preview",

        render: function () {
            this.model = this.collection.get(this.activeId);
            this.$el.html(this.template(this.templateData()));

            this.$('.content-preview-content').scrollClass({target: '.content-preview', offset: 10});
            this.$('.wrapper').on('click', 'a', function (e) {
                $(e.currentTarget).attr('target', '_blank');
            });

            if (this.model !== undefined) {
                this.addSubview(new Ghost.View.PostSettings({el: $('.post-controls'), model: this.model})).render();
            }

            Ghost.temporary.initToggles(this.$el);
            return this;
        }

    });

}());

/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    Ghost.Views.Debug = Ghost.View.extend({
        events: {
            "click .settings-menu a": "handleMenuClick",
            "click #startupload": "handleUploadClick",
            "click .js-delete": "handleDeleteClick"
        },

        initialize: function () {
            var view = this;

            this.uploadButton = this.$el.find('#startupload');

            // Disable import button and initizalize BlueImp file upload
            this.uploadButton.prop('disabled', 'disabled');
            $('#importfile').fileupload({
                url: Ghost.paths.apiRoot + '/db/',
                limitMultiFileUploads: 1,
                replaceFileInput: false,
                headers: {
                    'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                },
                dataType: 'json',
                add: function (e, data) {
                    /*jslint unparam:true*/

                    // Bind the upload data to the view, so it is
                    // available to the click handler, and enable the
                    // upload button.
                    view.fileUploadData = data;
                    data.context = view.uploadButton.removeProp('disabled');
                },
                done: function (e, data) {
                    /*jslint unparam:true*/
                    $('#startupload').text('Import');
                    if (!data.result) {
                        throw new Error('No response received from server.');
                    }
                    if (!data.result.message) {
                        throw new Error('Unknown error');
                    }

                    Ghost.notifications.addItem({
                        type: 'success',
                        message: data.result.message,
                        status: 'passive'
                    });
                },
                error: function (response) {
                    $('#startupload').text('Import');
                    var responseJSON = response.responseJSON,
                        message = responseJSON && responseJSON.error ? responseJSON.error : 'unknown';
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: ['A problem was encountered while importing new content to your blog. Error: ', message].join(''),
                        status: 'passive'
                    });
                }

            });

        },

        handleMenuClick: function (ev) {
            ev.preventDefault();

            var $target = $(ev.currentTarget);

            // Hide the current content
            this.$(".settings-content").hide();

            // Show the clicked content
            this.$("#debug-" + $target.attr("class")).show();

            return false;
        },

        handleUploadClick: function (ev) {
            ev.preventDefault();

            if (!this.uploadButton.prop('disabled')) {
                this.fileUploadData.context = this.uploadButton.text('Importing');
                this.fileUploadData.submit();
            }

            // Prevent double post by disabling the button.
            this.uploadButton.prop('disabled', 'disabled');
        },

        handleDeleteClick: function (ev) {
            ev.preventDefault();
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        confirm: {
                            accept: {
                                func: function () {
                                    $.ajax({
                                        url: Ghost.paths.apiRoot + '/db/',
                                        type: 'DELETE',
                                        headers: {
                                            'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                                        },
                                        success: function onSuccess(response) {
                                            if (!response) {
                                                throw new Error('No response received from server.');
                                            }
                                            if (!response.message) {
                                                throw new Error(response.detail || 'Unknown error');
                                            }

                                            Ghost.notifications.addItem({
                                                type: 'success',
                                                message: response.message,
                                                status: 'passive'
                                            });

                                        },
                                        error: function onError(response) {
                                            var responseText = JSON.parse(response.responseText),
                                                message = responseText && responseText.error ? responseText.error : 'unknown';
                                            Ghost.notifications.addItem({
                                                type: 'error',
                                                message: ['A problem was encountered while deleting content from your blog. Error: ', message].join(''),
                                                status: 'passive'
                                            });

                                        }
                                    });
                                },
                                text: "Yes"
                            },
                            reject: {
                                func: function () {
                                    return true;
                                },
                                text: "No"
                            }
                        },
                        type: "action",
                        style: ["wide", "centered"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'blank',
                        title: 'Would you really like to delete all content from your blog?',
                        text: '<p>This is permanent! No backups, no restores, no magic undo button. <br /> We warned you, ok?</p>'
                    }
                }
            }));
        }
    });
}());

// The Tag UI area associated with a post

/*global window, document, setTimeout, $, _, Backbone, Ghost */

(function () {
    "use strict";

    Ghost.View.EditorTagWidget = Ghost.View.extend({

        events: {
            'keyup [data-input-behaviour="tag"]': 'handleKeyup',
            'keydown [data-input-behaviour="tag"]': 'handleKeydown',
            'keypress [data-input-behaviour="tag"]': 'handleKeypress',
            'click ul.suggestions li': 'handleSuggestionClick',
            'click .tags .tag': 'handleTagClick',
            'click .tag-label': 'mobileTags'
        },

        keys: {
            UP: 38,
            DOWN: 40,
            ESC: 27,
            ENTER: 13,
            BACKSPACE: 8
        },

        initialize: function () {
            var self = this,
                tagCollection = new Ghost.Collections.Tags();

            tagCollection.fetch().then(function () {
                self.allGhostTags = tagCollection.toJSON();
            });

            this.listenTo(this.model, 'willSave', this.completeCurrentTag, this);
        },

        render: function () {
            var tags = this.model.get('tags'),
                $tags = $('.tags'),
                tagOffset,
                self = this;

            $tags.empty();

            if (tags) {
                _.forEach(tags, function (tag) {
                    var $tag = $('<span class="tag" data-tag-id="' + tag.id + '">' + tag.name + '</span>');
                    $tags.append($tag);
                    $("[data-tag-id=" + tag.id + "]")[0].scrollIntoView(true);
                });
            }

            this.$suggestions = $("ul.suggestions").hide(); // Initialise suggestions overlay

            if ($tags.length) {
                tagOffset = $('.tag-input').offset().left;
                $('.tag-blocks').css({'left': tagOffset + 'px'});
            }

            $(window).on('resize', self.resize).trigger('resize');

            $('.tag-label').on('touchstart', function () {
                $(this).addClass('touch');
            });

            return this;
        },

        mobileTags: function () {
            var mq = window.matchMedia("(max-width: 400px)"),
                publishBar = $("#publish-bar");
            if (mq.matches) {

                if (publishBar.hasClass("extended-tags")) {
                    publishBar.css("top", "auto").animate({"height": "40px"}, 300, "swing", function () {
                        $(this).removeClass("extended-tags");
                        $(".tag-input").blur();
                    });
                } else {
                    publishBar.animate({"top": 0, "height": $(window).height()}, 300, "swing", function () {
                        $(this).addClass("extended-tags");
                        $(".tag-input").focus();
                    });
                }

                $(".tag-input").one("blur", function () {

                    if (publishBar.hasClass("extended-tags") && !$(':hover').last().hasClass("tag")) {
                        publishBar.css("top", "auto").animate({"height": "40px"}, 300, "swing", function () {
                            $(this).removeClass("extended-tags");
                            $(document.activeElement).blur();
                            document.documentElement.style.display = "none";
                            setTimeout(function () { document.documentElement.style.display = 'block'; }, 0);
                        });
                    }
                });

                window.scrollTo(0, 1);
            }
        },

        showSuggestions: function ($target, _searchTerm) {
            var searchTerm = _searchTerm.toLowerCase(),
                matchingTags = this.findMatchingTags(searchTerm),
                styles = {
                    left: $target.position().left
                },
                maxSuggestions = 5, // Limit the suggestions number
                regexTerm = searchTerm.replace(/(\s+)/g, "(<[^>]+>)*$1(<[^>]+>)*"),
                regexPattern = new RegExp("(" + regexTerm + ")", "i");

            this.$suggestions.css(styles);
            this.$suggestions.html("");

            matchingTags = _.first(matchingTags, maxSuggestions);
            if (matchingTags.length > 0) {
                this.$suggestions.show();
            }
            _.each(matchingTags, function (matchingTag) {
                var highlightedName,
                    suggestionHTML;

                highlightedName = matchingTag.name.replace(regexPattern, "<mark>$1</mark>");
                /*jslint regexp: true */ // - would like to remove this
                highlightedName = highlightedName.replace(/(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/, "$1</mark>$2<mark>$4");

                suggestionHTML = "<li data-tag-id='" + matchingTag.id + "' data-tag-name='" + matchingTag.name + "'><a href='#'>" + highlightedName + "</a></li>";
                this.$suggestions.append(suggestionHTML);
            }, this);
        },

        handleKeyup: function (e) {
            var $target = $(e.currentTarget),
                searchTerm = $.trim($target.val());

            if (searchTerm) {
                this.showSuggestions($target, searchTerm);
            } else {
                this.$suggestions.hide();
            }

            if (e.keyCode === this.keys.UP) {
                e.preventDefault();
                if (this.$suggestions.is(":visible")) {
                    if (this.$suggestions.children(".selected").length === 0) {
                        this.$suggestions.find("li:last-child").addClass('selected');
                    } else {
                        this.$suggestions.children(".selected").removeClass('selected').prev().addClass('selected');
                    }
                }
            } else if (e.keyCode === this.keys.DOWN) {
                e.preventDefault();
                if (this.$suggestions.is(":visible")) {
                    if (this.$suggestions.children(".selected").length === 0) {
                        this.$suggestions.find("li:first-child").addClass('selected');
                    } else {
                        this.$suggestions.children(".selected").removeClass('selected').next().addClass('selected');
                    }
                }
            } else if (e.keyCode === this.keys.ESC) {
                this.$suggestions.hide();
            }

            if (e.keyCode === this.keys.UP || e.keyCode === this.keys.DOWN) {
                return false;
            }
        },

        handleKeydown: function (e) {
            var $target = $(e.currentTarget),
                lastBlock,
                tag;
            // Delete character tiggers on Keydown, so needed to check on that event rather than Keyup.
            if (e.keyCode === this.keys.BACKSPACE && !$target.val()) {
                lastBlock = this.$('.tags').find('.tag').last();
                lastBlock.remove();
                tag = {id: lastBlock.data('tag-id'), name: lastBlock.text()};
                this.model.removeTag(tag);
            }
        },

        handleKeypress: function (e) {
            var $target = $(e.currentTarget),
                searchTerm = $.trim($target.val()),
                tag,
                $selectedSuggestion,
                isComma = ",".localeCompare(String.fromCharCode(e.keyCode || e.charCode)) === 0;

            // use localeCompare in case of international keyboard layout
            if ((e.keyCode === this.keys.ENTER || isComma) && searchTerm) {
                // Submit tag using enter or comma key
                e.preventDefault();

                $selectedSuggestion = this.$suggestions.children(".selected");
                if (this.$suggestions.is(":visible") && $selectedSuggestion.length !== 0) {

                    if ($('.tag:containsExact("' + $selectedSuggestion.data('tag-name') + '")').length === 0) {
                        tag = {id: $selectedSuggestion.data('tag-id'), name: $selectedSuggestion.data('tag-name')};
                        this.addTag(tag);
                    }
                } else {
                    if (isComma) {
                        searchTerm = searchTerm.replace(/,/g, "");
                    }  // Remove comma from string if comma is used to submit.
                    if ($('.tag:containsExact("' + searchTerm + '")').length === 0) {
                        this.addTag({id: null, name: searchTerm});
                    }
                }
                $target.val('').focus();
                searchTerm = ""; // Used to reset search term
                this.$suggestions.hide();
            }
        },

        completeCurrentTag: function () {
            var $target = this.$('.tag-input'),
                tagName = $target.val(),
                usedTagNames,
                hasAlreadyBeenAdded;

            usedTagNames = _.map(this.model.get('tags'), function (tag) {
                return tag.name.toUpperCase();
            });
            hasAlreadyBeenAdded = usedTagNames.indexOf(tagName.toUpperCase()) !== -1;

            if (tagName.length > 0 && !hasAlreadyBeenAdded) {
                this.addTag({id: null, name: tagName});
            }
        },

        handleSuggestionClick: function (e) {
            var $target = $(e.currentTarget);
            if (e) { e.preventDefault(); }
            this.addTag({id: $target.data('tag-id'), name: $target.data('tag-name')});
        },

        handleTagClick: function (e) {
            var $tag = $(e.currentTarget),
                tag = {id: $tag.data('tag-id'), name: $tag.text()};
            $tag.remove();
            window.scrollTo(0, 1);
            this.model.removeTag(tag);
        },

        resize: _.throttle(function () {
            var $tags = $('.tags');
            if ($(window).width() > 400) {
                $tags.css("max-width", $("#entry-tags").width() - 320);
            } else {
                $tags.css("max-width", "inherit");
            }
        }, 50),

        findMatchingTags: function (searchTerm) {
            var matchingTagModels,
                self = this;

            if (!this.allGhostTags) {
                return [];
            }

            searchTerm = searchTerm.toUpperCase();
            matchingTagModels = _.filter(this.allGhostTags, function (tag) {
                var tagNameMatches,
                    hasAlreadyBeenAdded;

                tagNameMatches = tag.name.toUpperCase().indexOf(searchTerm) !== -1;

                hasAlreadyBeenAdded = _.some(self.model.get('tags'), function (usedTag) {
                    return tag.name.toUpperCase() === usedTag.name.toUpperCase();
                });
                return tagNameMatches && !hasAlreadyBeenAdded;
            });

            return matchingTagModels;
        },

        addTag: function (tag) {
            var $tag = $('<span class="tag" data-tag-id="' + tag.id + '">' + tag.name + '</span>');
            this.$('.tags').append($tag);
            $(".tag").last()[0].scrollIntoView(true);
            window.scrollTo(0, 1);
            this.model.addTag(tag);

            this.$('.tag-input').val('').focus();
            this.$suggestions.hide();
        }
    });

}());

// # Article Editor

/*global window, document, setTimeout, navigator, $, _, Backbone, Ghost, Showdown, CodeMirror, shortcut, Countable, JST */
(function () {
    "use strict";

    /*jslint regexp: true, bitwise: true */
    var PublishBar,
        ActionsWidget,
        UploadManager,
        MarkerManager,
        MarkdownShortcuts = [
            {'key': 'Ctrl+B', 'style': 'bold'},
            {'key': 'Meta+B', 'style': 'bold'},
            {'key': 'Ctrl+I', 'style': 'italic'},
            {'key': 'Meta+I', 'style': 'italic'},
            {'key': 'Ctrl+Alt+U', 'style': 'strike'},
            {'key': 'Ctrl+Shift+K', 'style': 'code'},
            {'key': 'Meta+K', 'style': 'code'},
            {'key': 'Ctrl+Alt+1', 'style': 'h1'},
            {'key': 'Ctrl+Alt+2', 'style': 'h2'},
            {'key': 'Ctrl+Alt+3', 'style': 'h3'},
            {'key': 'Ctrl+Alt+4', 'style': 'h4'},
            {'key': 'Ctrl+Alt+5', 'style': 'h5'},
            {'key': 'Ctrl+Alt+6', 'style': 'h6'},
            {'key': 'Ctrl+Shift+L', 'style': 'link'},
            {'key': 'Ctrl+Shift+I', 'style': 'image'},
            {'key': 'Ctrl+Q', 'style': 'blockquote'},
            {'key': 'Ctrl+Shift+1', 'style': 'currentDate'},
            {'key': 'Ctrl+U', 'style': 'uppercase'},
            {'key': 'Ctrl+Shift+U', 'style': 'lowercase'},
            {'key': 'Ctrl+Alt+Shift+U', 'style': 'titlecase'},
            {'key': 'Ctrl+Alt+W', 'style': 'selectword'},
            {'key': 'Ctrl+L', 'style': 'list'},
            {'key': 'Ctrl+Alt+C', 'style': 'copyHTML'},
            {'key': 'Meta+Alt+C', 'style': 'copyHTML'},
            {'key': 'Meta+Enter', 'style': 'newLine'},
            {'key': 'Ctrl+Enter', 'style': 'newLine'}
        ],
        imageMarkdownRegex = /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
        markerRegex = /\{<([\w\W]*?)>\}/;
    /*jslint regexp: false, bitwise: false */

    // The publish bar associated with a post, which has the TagWidget and
    // Save button and options and such.
    // ----------------------------------------
    PublishBar = Ghost.View.extend({

        initialize: function () {
            this.addSubview(new Ghost.View.EditorTagWidget({el: this.$('#entry-tags'), model: this.model})).render();
            this.addSubview(new ActionsWidget({el: this.$('#entry-actions'), model: this.model})).render();
            this.addSubview(new Ghost.View.PostSettings({el: $('#entry-controls'), model: this.model})).render();
        },

        render: function () { return this; }

    });

    // The Publish, Queue, Publish Now buttons
    // ----------------------------------------
    ActionsWidget = Ghost.View.extend({

        events: {
            'click [data-set-status]': 'handleStatus',
            'click .js-publish-button': 'handlePostButton'
        },

        statusMap: null,

        createStatusMap: {
            'draft': 'Save Draft',
            'published': 'Publish Now'
        },

        updateStatusMap: {
            'draft': 'Unpublish',
            'published': 'Update Post'
        },

        //TODO: This has to be moved to the I18n localization file.
        //This structure is supposed to be close to the i18n-localization which will be used soon. 
        messageMap: {
            errors: {
                post: {
                    published: {
                        'published': 'Your post could not be updated.',
                        'draft': 'Your post could not be saved as a draft.'
                    },
                    draft: {
                        'published': 'Your post could not be published.',
                        'draft': 'Your post could not be saved as a draft.'
                    }

                }
            },

            success: {
                post: {
                    published: {
                        'published': 'Your post has been updated.',
                        'draft': 'Your post has been saved as a draft.'
                    },
                    draft: {
                        'published': 'Your post has been published.',
                        'draft': 'Your post has been saved as a draft.'
                    }
                }
            }
        },

        initialize: function () {
            var self = this;
            // Toggle publish
            shortcut.add("Ctrl+Alt+P", function () {
                self.toggleStatus();
            });
            shortcut.add("Ctrl+S", function () {
                self.updatePost();
            });
            shortcut.add("Meta+S", function () {
                self.updatePost();
            });
            this.listenTo(this.model, 'change:status', this.render);
        },

        toggleStatus: function () {
            var self = this,
                keys = Object.keys(this.statusMap),
                model = self.model,
                prevStatus = model.get('status'),
                currentIndex = keys.indexOf(prevStatus),
                newIndex,
                status;

            newIndex = currentIndex + 1 > keys.length - 1 ? 0 : currentIndex + 1;
            status = keys[newIndex];

            this.setActiveStatus(keys[newIndex], this.statusMap[status], prevStatus);

            this.savePost({
                status: keys[newIndex]
            }).then(function () {
                self.reportSaveSuccess(status, prevStatus);
            }, function (xhr) {
                // Show a notification about the error
                self.reportSaveError(xhr, model, status, prevStatus);
            });
        },

        setActiveStatus: function (newStatus, displayText, currentStatus) {
            var isPublishing = (newStatus === 'published' && currentStatus !== 'published'),
                isUnpublishing = (newStatus === 'draft' && currentStatus === 'published'),
                // Controls when background of button has the splitbutton-delete/button-delete classes applied
                isImportantStatus = (isPublishing || isUnpublishing);

            $('.js-publish-splitbutton')
                .removeClass(isImportantStatus ? 'splitbutton-save' : 'splitbutton-delete')
                .addClass(isImportantStatus ? 'splitbutton-delete' : 'splitbutton-save');

            // Set the publish button's action and proper coloring
            $('.js-publish-button')
                .attr('data-status', newStatus)
                .text(displayText)
                .removeClass(isImportantStatus ? 'button-save' : 'button-delete')
                .addClass(isImportantStatus ? 'button-delete' : 'button-save');

            // Remove the animated popup arrow
            $('.js-publish-splitbutton > a')
                .removeClass('active');

            // Set the active action in the popup
            $('.js-publish-splitbutton .editor-options li')
                .removeClass('active')
                .filter(['li[data-set-status="', newStatus, '"]'].join(''))
                    .addClass('active');
        },

        handleStatus: function (e) {
            if (e) { e.preventDefault(); }
            var status = $(e.currentTarget).attr('data-set-status'),
                currentStatus = this.model.get('status');

            this.setActiveStatus(status, this.statusMap[status], currentStatus);

            // Dismiss the popup menu
            $('body').find('.overlay:visible').fadeOut();
        },

        handlePostButton: function (e) {
            if (e) { e.preventDefault(); }
            var status = $(e.currentTarget).attr('data-status');

            this.updatePost(status);
        },

        updatePost: function (status) {
            var self = this,
                model = this.model,
                prevStatus = model.get('status');

            // Default to same status if not passed in
            status = status || prevStatus;

            model.trigger('willSave');

            this.savePost({
                status: status
            }).then(function () {
                self.reportSaveSuccess(status, prevStatus);
                // Refresh publish button and all relevant controls with updated status.
                self.render();
            }, function (xhr) {
                // Set the model status back to previous
                model.set({ status: prevStatus });
                // Set appropriate button status
                self.setActiveStatus(status, self.statusMap[status], prevStatus);
                // Show a notification about the error
                self.reportSaveError(xhr, model, status, prevStatus);
            });
        },

        savePost: function (data) {
            _.each(this.model.blacklist, function (item) {
                this.model.unset(item);
            }, this);

            var saved = this.model.save(_.extend({
                title: $('#entry-title').val(),
                // TODO: The content_raw getter here isn't great, shouldn't rely on currentView.
                markdown: Ghost.currentView.getEditorValue()
            }, data));

            // TODO: Take this out if #2489 gets merged in Backbone. Or patch Backbone
            // ourselves for more consistent promises.
            if (saved) {
                return saved;
            }
            return $.Deferred().reject();
        },

        reportSaveSuccess: function (status, prevStatus) {
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'success',
                message: this.messageMap.success.post[prevStatus][status],
                status: 'passive'
            });
            Ghost.currentView.setEditorDirty(false);
        },

        reportSaveError: function (response, model, status, prevStatus) {
            var message = this.messageMap.errors.post[prevStatus][status];

            if (response) {
                // Get message from response
                message += " " + Ghost.Views.Utils.getRequestErrorMessage(response);
            } else if (model.validationError) {
                // Grab a validation error
                message += " " + model.validationError;
            }

            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        },

        setStatusLabels: function (statusMap) {
            _.each(statusMap, function (label, status) {
                $('li[data-set-status="' + status + '"] > a').text(label);
            });
        },

        render: function () {
            var status = this.model.get('status');

            // Assume that we're creating a new post
            if (status !== 'published') {
                this.statusMap = this.createStatusMap;
            } else {
                this.statusMap = this.updateStatusMap;
            }

            // Populate the publish menu with the appropriate verbiage
            this.setStatusLabels(this.statusMap);

            // Default the selected publish option to the current status of the post.
            this.setActiveStatus(status, this.statusMap[status], status);
        }

    });

    // The entire /editor page's route
    // ----------------------------------------
    Ghost.Views.Editor = Ghost.View.extend({

        initialize: function () {
            var self = this;

            // Add the container view for the Publish Bar
            this.addSubview(new PublishBar({el: "#publish-bar", model: this.model})).render();

            this.$('#entry-title').val(this.model.get('title')).focus();
            this.$('#entry-markdown').text(this.model.get('markdown'));

            this.listenTo(this.model, 'change:title', this.renderTitle);
            this.listenTo(this.model, 'change:id', function (m) {
                // This is a special case for browsers which fire an unload event when using navigate. The id change
                // happens before the save success and can cause the unload alert to appear incorrectly on first save
                // The id only changes in the event that the save has been successful, so this workaround is safes
                self.setEditorDirty(false);
                Backbone.history.navigate('/editor/' + m.id + '/');
            });

            this.initMarkdown();
            this.renderPreview();

            $('.entry-content header, .entry-preview header').on('click', function () {
                $('.entry-content, .entry-preview').removeClass('active');
                $(this).closest('section').addClass('active');
            });

            $('.entry-title .icon-fullscreen').on('click', function (e) {
                e.preventDefault();
                $('body').toggleClass('fullscreen');
            });

            this.$('.CodeMirror-scroll').on('scroll', this.syncScroll);

            this.$('.CodeMirror-scroll').scrollClass({target: '.entry-markdown', offset: 10});
            this.$('.entry-preview-content').scrollClass({target: '.entry-preview', offset: 10});


            // Zen writing mode shortcut
            shortcut.add("Alt+Shift+Z", function () {
                $('body').toggleClass('zen');
            });

            $('.entry-markdown header, .entry-preview header').click(function (e) {
                $('.entry-markdown, .entry-preview').removeClass('active');
                $(e.target).closest('section').addClass('active');
            });

            // Deactivate default drag/drop action
            $(document).bind('drop dragover', function (e) {
                e.preventDefault();
            });
        },

        events: {
            'click .markdown-help': 'showHelp',
            'blur #entry-title': 'trimTitle',
            'orientationchange': 'orientationChange'
        },

        syncScroll: _.throttle(function (e) {
            var $codeViewport = $(e.target),
                $previewViewport = $('.entry-preview-content'),
                $codeContent = $('.CodeMirror-sizer'),
                $previewContent = $('.rendered-markdown'),

                // calc position
                codeHeight = $codeContent.height() - $codeViewport.height(),
                previewHeight = $previewContent.height() - $previewViewport.height(),
                ratio = previewHeight / codeHeight,
                previewPostition = $codeViewport.scrollTop() * ratio;

            // apply new scroll
            $previewViewport.scrollTop(previewPostition);
        }, 10),

        showHelp: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: ["wide"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'markdown',
                        title: 'Markdown Help'
                    }
                }
            }));
        },

        trimTitle: function () {
            var $title = $('#entry-title'),
                rawTitle = $title.val(),
                trimmedTitle = $.trim(rawTitle);

            if (rawTitle !== trimmedTitle) {
                $title.val(trimmedTitle);
            }

            // Trigger title change for post-settings.js
            this.model.set('title', trimmedTitle);
        },

        renderTitle: function () {
            this.$('#entry-title').val(this.model.get('title'));
        },

        // This is a hack to remove iOS6 white space on orientation change bug
        // See: http://cl.ly/RGx9
        orientationChange: function () {
            if (/iPhone/.test(navigator.userAgent) && !/Opera Mini/.test(navigator.userAgent)) {
                var focusedElement = document.activeElement,
                    s = document.documentElement.style;
                focusedElement.blur();
                s.display = 'none';
                setTimeout(function () { s.display = 'block'; focusedElement.focus(); }, 0);
            }
        },

        // This updates the editor preview panel.
        // Currently gets called on every key press.
        // Also trigger word count update
        renderPreview: function () {
            var self = this,
                preview = document.getElementsByClassName('rendered-markdown')[0];
            preview.innerHTML = this.converter.makeHtml(this.editor.getValue());

            this.initUploads();

            Countable.once(preview, function (counter) {
                self.$('.entry-word-count').text($.pluralize(counter.words, 'word'));
                self.$('.entry-character-count').text($.pluralize(counter.characters, 'character'));
                self.$('.entry-paragraph-count').text($.pluralize(counter.paragraphs, 'paragraph'));
            });
        },

        // Markdown converter & markdown shortcut initialization.
        initMarkdown: function () {
            var self = this;

            this.converter = new Showdown.converter({extensions: ['ghostdown', 'github']});
            this.editor = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
                mode: 'gfm',
                tabMode: 'indent',
                tabindex: "2",
                lineWrapping: true,
                dragDrop: false,
                extraKeys: {
                    Home: "goLineLeft",
                    End: "goLineRight"
                }
            });
            this.uploadMgr = new UploadManager(this.editor);

            // Inject modal for HTML to be viewed in
            shortcut.add("Ctrl+Alt+C", function () {
                self.showHTML();
            });
            shortcut.add("Ctrl+Alt+C", function () {
                self.showHTML();
            });

            _.each(MarkdownShortcuts, function (combo) {
                shortcut.add(combo.key, function () {
                    return self.editor.addMarkdown({style: combo.style});
                });
            });

            this.enableEditor();
        },

        options: {
            markers: {}
        },

        getEditorValue: function () {
            return this.uploadMgr.getEditorValue();
        },

        unloadDirtyMessage: function () {
            return "==============================\n\n" +
                "Hey there! It looks like you're in the middle of writing" +
                " something and you haven't saved all of your content." +
                "\n\nSave before you go!\n\n" +
                "==============================";
        },

        setEditorDirty: function (dirty) {
            window.onbeforeunload = dirty ? this.unloadDirtyMessage : null;
        },

        initUploads: function () {
            var filestorage = $('#entry-markdown-content').data('filestorage');
            this.$('.js-drop-zone').upload({editor: true, fileStorage: filestorage});
            this.$('.js-drop-zone').on('uploadstart', $.proxy(this.disableEditor, this));
            this.$('.js-drop-zone').on('uploadfailure', $.proxy(this.enableEditor, this));
            this.$('.js-drop-zone').on('uploadsuccess', $.proxy(this.enableEditor, this));
            this.$('.js-drop-zone').on('uploadsuccess', this.uploadMgr.handleUpload);
        },

        enableEditor: function () {
            var self = this;
            this.editor.setOption("readOnly", false);
            this.editor.on('change', function () {
                self.setEditorDirty(true);
                self.renderPreview();
            });
        },

        disableEditor: function () {
            var self = this;
            this.editor.setOption("readOnly", "nocursor");
            this.editor.off('change', function () {
                self.renderPreview();
            });
        },

        showHTML: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: ["wide"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'copyToHTML',
                        title: 'Copied HTML'
                    }
                }
            }));
        },

        render: function () { return this; }
    });

    MarkerManager = function (editor) {
        var markers = {},
            uploadPrefix = 'image_upload',
            uploadId = 1;

        function addMarker(line, ln) {
            var marker,
                magicId = '{<' + uploadId + '>}';
            editor.setLine(ln, magicId + line.text);
            marker = editor.markText(
                {line: ln, ch: 0},
                {line: ln, ch: (magicId.length)},
                {collapsed: true}
            );

            markers[uploadPrefix + '_' + uploadId] = marker;
            uploadId += 1;
        }

        function getMarkerRegexForId(id) {
            id = id.replace('image_upload_', '');
            return new RegExp('\\{<' + id + '>\\}', 'gmi');
        }

        function stripMarkerFromLine(line) {
            var markerText = line.text.match(markerRegex),
                ln = editor.getLineNumber(line);

            if (markerText) {
                editor.replaceRange('', {line: ln, ch: markerText.index}, {line: ln, ch: markerText.index + markerText[0].length});
            }
        }

        function findAndStripMarker(id) {
            editor.eachLine(function (line) {
                var markerText = getMarkerRegexForId(id).exec(line.text),
                    ln;

                if (markerText) {
                    ln = editor.getLineNumber(line);
                    editor.replaceRange('', {line: ln, ch: markerText.index}, {line: ln, ch: markerText.index + markerText[0].length});
                }
            });
        }

        function removeMarker(id, marker, line) {
            delete markers[id];
            marker.clear();

            if (line) {
                stripMarkerFromLine(line);
            } else {
                findAndStripMarker(id);
            }
        }

        function checkMarkers() {
            _.each(markers, function (marker, id) {
                var line;
                marker = markers[id];
                if (marker.find()) {
                    line = editor.getLineHandle(marker.find().from.line);
                    if (!line.text.match(imageMarkdownRegex)) {
                        removeMarker(id, marker, line);
                    }
                } else {
                    removeMarker(id, marker);
                }
            });
        }

        function initMarkers(line) {
            var isImage = line.text.match(imageMarkdownRegex),
                hasMarker = line.text.match(markerRegex);

            if (isImage && !hasMarker) {
                addMarker(line, editor.getLineNumber(line));
            }
        }

        // public api
        _.extend(this, {
            markers: markers,
            checkMarkers: checkMarkers,
            addMarker: addMarker,
            stripMarkerFromLine: stripMarkerFromLine,
            getMarkerRegexForId: getMarkerRegexForId
        });

        // Initialise
        editor.eachLine(initMarkers);
    };

    UploadManager = function (editor) {
        var markerMgr = new MarkerManager(editor);

        function findLine(result_id) {
            // try to find the right line to replace
            if (markerMgr.markers.hasOwnProperty(result_id) && markerMgr.markers[result_id].find()) {
                return editor.getLineHandle(markerMgr.markers[result_id].find().from.line);
            }

            return false;
        }

        function checkLine(ln, mode) {
            var line = editor.getLineHandle(ln),
                isImage = line.text.match(imageMarkdownRegex),
                hasMarker;

            // We care if it is an image
            if (isImage) {
                hasMarker = line.text.match(markerRegex);

                if (hasMarker && mode === 'paste') {
                    // this could be a duplicate, and won't be a real marker
                    markerMgr.stripMarkerFromLine(line);
                }

                if (!hasMarker) {
                    markerMgr.addMarker(line, ln);
                }
            }
            // TODO: hasMarker but no image?
        }

        function handleUpload(e, result_src) {
            /*jslint regexp: true, bitwise: true */
            var line = findLine($(e.currentTarget).attr('id')),
                lineNumber = editor.getLineNumber(line),
                match = line.text.match(/\([^\n]*\)?/),
                replacement = '(http://)';
            /*jslint regexp: false, bitwise: false */

            if (match) {
                // simple case, we have the parenthesis
                editor.setSelection({line: lineNumber, ch: match.index + 1}, {line: lineNumber, ch: match.index + match[0].length - 1});
            } else {
                match = line.text.match(/\]/);
                if (match) {
                    editor.replaceRange(
                        replacement,
                        {line: lineNumber, ch: match.index + 1},
                        {line: lineNumber, ch: match.index + 1}
                    );
                    editor.setSelection(
                        {line: lineNumber, ch: match.index + 2},
                        {line: lineNumber, ch: match.index + replacement.length }
                    );
                }
            }
            editor.replaceSelection(result_src);
        }

        function getEditorValue() {
            var value = editor.getValue();

            _.each(markerMgr.markers, function (marker, id) {
                /*jslint unparam:true*/
                value = value.replace(markerMgr.getMarkerRegexForId(id), '');
            });

            return value;
        }


        // Public API
        _.extend(this, {
            getEditorValue: getEditorValue,
            handleUpload: handleUpload
        });

        // initialise
        editor.on('change', function (cm, changeObj) {
            /*jslint unparam:true*/
            var linesChanged = _.range(changeObj.from.line, changeObj.from.line + changeObj.text.length);

            _.each(linesChanged, function (ln) {
                checkLine(ln, changeObj.origin);
            });

            // Is this a line which may have had a marker on it?
            markerMgr.checkMarkers();
        });
    };

}());

/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    Ghost.Views.Login = Ghost.View.extend({

        initialize: function () {
            this.render();
        },

        templateName: "login",

        events: {
            'submit #login': 'submitHandler'
        },

        afterRender: function () {
            var self = this;
            this.$el.css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                self.$("[name='email']").focus();
            });
        },

        submitHandler: function (event) {
            event.preventDefault();
            var email = this.$el.find('.email').val(),
                password = this.$el.find('.password').val(),
                redirect = Ghost.Views.Utils.getUrlVariables().r;

            Ghost.Validate._errors = [];
            Ghost.Validate.check(email).isEmail();
            Ghost.Validate.check(password, "Please enter a password").len(0);

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                $.ajax({
                    url: Ghost.paths.subdir + '/ghost/signin/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
                    data: {
                        email: email,
                        password: password,
                        redirect: redirect
                    },
                    success: function (msg) {
                        window.location.href = msg.redirect;
                    },
                    error: function (xhr) {
                        Ghost.notifications.clearEverything();
                        Ghost.notifications.addItem({
                            type: 'error',
                            message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                            status: 'passive'
                        });
                    }
                });
            }
        }
    });

    Ghost.Views.Signup = Ghost.View.extend({

        initialize: function () {
            this.submitted = "no";
            this.render();
        },

        templateName: "signup",

        events: {
            'submit #signup': 'submitHandler'
        },

        afterRender: function () {
            var self = this;

            this.$el
                .css({"opacity": 0})
                .animate({"opacity": 1}, 500, function () {
                    self.$("[name='name']").focus();
                });
        },

        submitHandler: function (event) {
            event.preventDefault();
            var name = this.$('.name').val(),
                email = this.$('.email').val(),
                password = this.$('.password').val();

            // This is needed due to how error handling is done. If this is not here, there will not be a time
            // when there is no error.
            Ghost.Validate._errors = [];
            Ghost.Validate.check(name, "Please enter a name").len(1);
            Ghost.Validate.check(email, "Please enter a correct email address").isEmail();
            Ghost.Validate.check(password, "Your password is not long enough. It must be at least 8 characters long.").len(8);
            Ghost.Validate.check(this.submitted, "Ghost is signing you up. Please wait...").equals("no");

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                this.submitted = "yes";
                $.ajax({
                    url: Ghost.paths.subdir + '/ghost/signup/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
                    data: {
                        name: name,
                        email: email,
                        password: password
                    },
                    success: function (msg) {
                        window.location.href = msg.redirect;
                    },
                    error: function (xhr) {
                        this.submitted = "no";
                        Ghost.notifications.clearEverything();
                        Ghost.notifications.addItem({
                            type: 'error',
                            message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                            status: 'passive'
                        });
                    }
                });
            }
        }
    });

    Ghost.Views.Forgotten = Ghost.View.extend({

        initialize: function () {
            this.render();
        },

        templateName: "forgotten",

        events: {
            'submit #forgotten': 'submitHandler'
        },

        afterRender: function () {
            var self = this;
            this.$el.css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                self.$("[name='email']").focus();
            });
        },

        submitHandler: function (event) {
            event.preventDefault();

            var email = this.$el.find('.email').val();

            Ghost.Validate._errors = [];
            Ghost.Validate.check(email).isEmail();

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                $.ajax({
                    url: Ghost.paths.subdir + '/ghost/forgotten/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
                    data: {
                        email: email
                    },
                    success: function (msg) {

                        window.location.href = msg.redirect;
                    },
                    error: function (xhr) {
                        Ghost.notifications.clearEverything();
                        Ghost.notifications.addItem({
                            type: 'error',
                            message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                            status: 'passive'
                        });
                    }
                });
            }
        }
    });

    Ghost.Views.ResetPassword = Ghost.View.extend({
        templateName: 'reset',

        events: {
            'submit #reset': 'submitHandler'
        },

        initialize: function (attrs) {
            attrs = attrs || {};

            this.token = attrs.token;

            this.render();
        },

        afterRender: function () {
            var self = this;
            this.$el.css({"opacity": 0}).animate({"opacity": 1}, 500, function () {
                self.$("[name='newpassword']").focus();
            });
        },

        submitHandler: function (ev) {
            ev.preventDefault();

            var self = this,
                newPassword = this.$('input[name="newpassword"]').val(),
                ne2Password = this.$('input[name="ne2password"]').val();

            if (newPassword !== ne2Password) {
                Ghost.notifications.clearEverything();
                Ghost.notifications.addItem({
                    type: 'error',
                    message: "Your passwords do not match.",
                    status: 'passive'
                });

                return;
            }

            this.$('input, button').prop('disabled', true);

            $.ajax({
                url: Ghost.paths.subdir + '/ghost/reset/' + this.token + '/',
                type: 'POST',
                headers: {
                    'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                },
                data: {
                    newpassword: newPassword,
                    ne2password: ne2Password
                },
                success: function (msg) {
                    window.location.href = msg.redirect;
                },
                error: function (xhr) {
                    self.$('input, button').prop('disabled', false);

                    Ghost.notifications.clearEverything();
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });

            return false;
        }
    });
}());

// The Post Settings Menu available in the content preview screen, as well as the post editor.

/*global window, document, $, _, Backbone, Ghost, moment */

(function () {
    "use strict";

    var parseDateFormats = ["DD MMM YY HH:mm", "DD MMM YYYY HH:mm", "DD/MM/YY HH:mm", "DD/MM/YYYY HH:mm",
            "DD-MM-YY HH:mm", "DD-MM-YYYY HH:mm", "YYYY-MM-DD HH:mm"],
        displayDateFormat = 'DD MMM YY @ HH:mm';

    Ghost.View.PostSettings = Ghost.View.extend({

        events: {
            'blur  .post-setting-slug' : 'editSlug',
            'click .post-setting-slug' : 'selectSlug',
            'blur  .post-setting-date' : 'editDate',
            'click .post-setting-static-page' : 'toggleStaticPage',
            'click .delete' : 'deletePost'
        },

        initialize: function () {
            if (this.model) {
                // These three items can be updated outside of the post settings menu, so have to be listened to.
                this.listenTo(this.model, 'change:id', this.render);
                this.listenTo(this.model, 'change:title', this.updateSlugPlaceholder);
                this.listenTo(this.model, 'change:published_at', this.updatePublishedDate);
            }
        },

        render: function () {
            var slug = this.model ? this.model.get('slug') : '',
                pubDate = this.model ? this.model.get('published_at') : 'Not Published',
                $pubDateEl = this.$('.post-setting-date'),
                $postSettingSlugEl = this.$('.post-setting-slug');

            $postSettingSlugEl.val(slug);

            // Update page status test if already a page.
            if (this.model && this.model.get('page')) {
                $('.post-setting-static-page').prop('checked', this.model.get('page'));
            }

            // Insert the published date, and make it editable if it exists.
            if (this.model && this.model.get('published_at')) {
                pubDate = moment(pubDate).format(displayDateFormat);
                $pubDateEl.attr('placeholder', '');
            } else {
                $pubDateEl.attr('placeholder', moment().format(displayDateFormat));
            }

            if (this.model && this.model.get('id')) {
                this.$('.post-setting-page').removeClass('hidden');
                this.$('.delete').removeClass('hidden');
            }

            // Apply different style for model's that aren't
            // yet persisted to the server.
            // Mostly we're hiding the delete post UI
            if (this.model.id === undefined) {
                this.$el.addClass('unsaved');
            } else {
                this.$el.removeClass('unsaved');
            }

            $pubDateEl.val(pubDate);
        },

        // Requests a new slug when the title was changed
        updateSlugPlaceholder: function () {
            var title = this.model.get('title'),
                $postSettingSlugEl = this.$('.post-setting-slug');

            // If there's a title present we want to
            // validate it against existing slugs in the db
            // and then update the placeholder value.
            if (title) {
                $.ajax({
                    url: Ghost.paths.apiRoot + '/posts/getSlug/' + encodeURIComponent(title) + '/',
                    success: function (result) {
                        $postSettingSlugEl.attr('placeholder', result);
                    }
                });
            } else {
                // If there's no title set placeholder to blank
                // and don't make an ajax request to server
                // for a proper slug (as there won't be any).
                $postSettingSlugEl.attr('placeholder', '');
                return;
            }
        },

        selectSlug: function (e) {
            e.currentTarget.select();
        },

        editSlug: _.debounce(function (e) {
            e.preventDefault();
            var self = this,
                slug = self.model.get('slug'),
                slugEl = e.currentTarget,
                newSlug = slugEl.value;

            // If the model doesn't currently
            // exist on the server (aka has no id)
            // then just update the model's value
            if (self.model.id === undefined) {
                this.model.set({
                    slug: newSlug
                });
                return;
            }

            // Ignore unchanged slugs
            if (slug === newSlug) {
                slugEl.value = slug === undefined ? '' : slug;
                return;
            }

            this.model.save({
                slug: newSlug
            }, {
                success : function (model, response, options) {
                    /*jslint unparam:true*/
                    // Repopulate slug in case it changed on the server (e.g. 'new-slug-2')
                    slugEl.value = model.get('slug');
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Permalink successfully changed to <strong>" + model.get('slug') + '</strong>.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jslint unparam:true*/
                    slugEl.value = model.previous('slug');
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        }, 500),


        updatePublishedDate: function () {
            var pubDate = this.model.get('published_at') ? moment(this.model.get('published_at'))
                    .format(displayDateFormat) : '',
                $pubDateEl = this.$('.post-setting-date');

            // Only change the date if it's different
            if (pubDate && $pubDateEl.val() !== pubDate) {
                $pubDateEl.val(pubDate);
            }
        },

        editDate: _.debounce(function (e) {
            e.preventDefault();
            var self = this,
                errMessage = '',
                pubDate = self.model.get('published_at') ? moment(self.model.get('published_at'))
                    .format(displayDateFormat) : '',
                pubDateEl = e.currentTarget,
                newPubDate = pubDateEl.value,
                pubDateMoment,
                newPubDateMoment;

            // if there is no new pub date do nothing
            if (!newPubDate) {
                return;
            }

            // Check for missing time stamp on new data
            // If no time specified, add a 12:00
            if (newPubDate && !newPubDate.slice(-5).match(/\d+:\d\d/)) {
                newPubDate += " 12:00";
            }

            newPubDateMoment = moment(newPubDate, parseDateFormats);

            // If there was a published date already set
            if (pubDate) {
                 // Check for missing time stamp on current model
                // If no time specified, add a 12:00
                if (!pubDate.slice(-5).match(/\d+:\d\d/)) {
                    pubDate += " 12:00";
                }

                pubDateMoment = moment(pubDate, parseDateFormats);

                 // Ensure the published date has changed
                if (newPubDate.length === 0 || pubDateMoment.isSame(newPubDateMoment)) {
                    // If it wasn't, reset it and return
                    pubDateEl.value = pubDateMoment.format(displayDateFormat);
                    return;
                }
            }

            // Validate new Published date
            if (!newPubDateMoment.isValid()) {
                errMessage = 'Published Date must be a valid date with format: DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
            }

            if (newPubDateMoment.diff(new Date(), 'h') > 0) {
                errMessage = 'Published Date cannot currently be in the future.';
            }

            if (errMessage.length) {
                // Show error message
                Ghost.notifications.addItem({
                    type: 'error',
                    message: errMessage,
                    status: 'passive'
                });

                // Reset back to original value and return
                pubDateEl.value = pubDateMoment ? pubDateMoment.format(displayDateFormat) : '';
                return;
            }

            // If the model doesn't currently
            // exist on the server (aka has no id)
            // then just update the model's value
            if (self.model.id === undefined) {
                this.model.set({
                    published_at: newPubDateMoment.toDate()
                });
                return;
            }

            // Save new 'Published' date
            this.model.save({
                published_at: newPubDateMoment.toDate()
            }, {
                success : function (model) {
                    pubDateEl.value = moment(model.get('published_at')).format(displayDateFormat);
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: 'Publish date successfully changed to <strong>' + pubDateEl.value + '</strong>.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jslint unparam:true*/
                    //  Reset back to original value
                    pubDateEl.value = pubDateMoment ? pubDateMoment.format(displayDateFormat) : '';
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });

        }, 500),

        toggleStaticPage: _.debounce(function (e) {
            var pageEl = $(e.currentTarget),
                page = pageEl.prop('checked');

            // Don't try to save
            // if the model doesn't currently
            // exist on the server
            if (this.model.id === undefined) {
                this.model.set({
                    page: page
                });
                return;
            }

            this.model.save({
                page: page
            }, {
                success : function (model, response, options) {
                    /*jslint unparam:true*/
                    pageEl.prop('checked', page);
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Successfully converted " + (page ? "to static page" : "to post") + '.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jslint unparam:true*/
                    pageEl.prop('checked', model.previous('page'));
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        }, 500),

        deletePost: function (e) {
            e.preventDefault();
            var self = this;
            // You can't delete a post
            // that hasn't yet been saved
            if (this.model.id === undefined) {
                return;
            }
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: false,
                        confirm: {
                            accept: {
                                func: function () {
                                    self.model.destroy({
                                        wait: true
                                    }).then(function () {
                                        // Redirect to content screen if deleting post from editor.
                                        if (window.location.pathname.indexOf('editor') > -1) {
                                            window.location = Ghost.paths.subdir + '/ghost/content/';
                                        }
                                        Ghost.notifications.addItem({
                                            type: 'success',
                                            message: 'Your post has been deleted.',
                                            status: 'passive'
                                        });
                                    }, function () {
                                        Ghost.notifications.addItem({
                                            type: 'error',
                                            message: 'Your post could not be deleted. Please try again.',
                                            status: 'passive'
                                        });
                                    });
                                },
                                text: "Yes"
                            },
                            reject: {
                                func: function () {
                                    return true;
                                },
                                text: "No"
                            }
                        },
                        type: "action",
                        style: ["wide", "centered"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'blank',
                        title: 'Are you sure you want to delete this post?',
                        text: '<p>This is permanent! No backups, no restores, no magic undo button. <br /> We warned you, ok?</p>'
                    }
                }
            }));
        }

    });

}());

/*global window, document, Ghost, $, _, Backbone, Countable */
(function () {
    "use strict";

    var Settings = {};

    // Base view
    // ----------
    Ghost.Views.Settings = Ghost.View.extend({
        initialize: function (options) {
            $(".settings-content").removeClass('active');

            this.sidebar = new Settings.Sidebar({
                el: '.settings-sidebar',
                pane: options.pane,
                model: this.model
            });

            this.addSubview(this.sidebar);

            this.listenTo(Ghost.router, 'route:settings', this.changePane);
        },

        changePane: function (pane) {
            if (!pane) {
                // Can happen when trying to load /settings with no pane specified
                // let the router navigate itself to /settings/general
                return;
            }

            this.sidebar.showContent(pane);
        }
    });

    // Sidebar (tabs)
    // ---------------
    Settings.Sidebar = Ghost.View.extend({
        initialize: function (options) {
            this.render();
            this.menu = this.$('.settings-menu');
            this.showContent(options.pane);
        },

        models: {},

        events: {
            'click .settings-menu li' : 'switchPane'
        },

        switchPane: function (e) {
            e.preventDefault();
            var item = $(e.currentTarget),
                id = item.find('a').attr('href').substring(1);

            this.showContent(id);
        },

        showContent: function (id) {
            var self = this,
                model;

            Ghost.router.navigate('/settings/' + id + '/');
            Ghost.trigger('urlchange');
            if (this.pane && id === this.pane.el.id) {
                return;
            }
            _.result(this.pane, 'destroy');
            this.setActive(id);
            this.pane = new Settings[id]({ el: '.settings-content'});

            if (!this.models.hasOwnProperty(this.pane.options.modelType)) {
                model = this.models[this.pane.options.modelType] = new Ghost.Models[this.pane.options.modelType]();
                model.fetch().then(function () {
                    self.renderPane(model);
                });
            } else {
                model = this.models[this.pane.options.modelType];
                self.renderPane(model);
            }
        },

        renderPane: function (model) {
            this.pane.model = model;
            this.pane.render();
        },

        setActive: function (id) {
            this.menu.find('li').removeClass('active');
            this.menu.find('a[href=#' + id + ']').parent().addClass('active');
        },

        templateName: 'settings/sidebar'
    });

    // Content panes
    // --------------
    Settings.Pane = Ghost.View.extend({
        options: {
            modelType: 'Settings'
        },
        destroy: function () {
            this.$el.removeClass('active');
            this.undelegateEvents();
        },
        render: function () {
            this.$el.hide();
            Ghost.View.prototype.render.call(this);
            this.$el.fadeIn(300);
        },
        afterRender: function () {
            this.$el.attr('id', this.id);
            this.$el.addClass('active');
        },
        saveSuccess: function (model, response, options) {
            /*jslint unparam:true*/
            Ghost.notifications.clearEverything();
            // TODO: better messaging here?
            Ghost.notifications.addItem({
                type: 'success',
                message: 'Saved',
                status: 'passive'
            });
        },
        saveError: function (model, xhr) {
            /*jslint unparam:true*/
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'error',
                message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                status: 'passive'
            });
        },
        validationError: function (message) {
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        }
    });

    // TODO: use some kind of data-binding for forms

    // ### General settings
    Settings.general = Settings.Pane.extend({
        id: "general",

        events: {
            'click .button-save': 'saveSettings',
            'click .js-modal-logo': 'showLogo',
            'click .js-modal-cover': 'showCover'
        },

        saveSettings: function () {
            var self = this,
                title = this.$('#blog-title').val(),
                description = this.$('#blog-description').val(),
                email = this.$('#email-address').val(),
                postsPerPage = this.$('#postsPerPage').val(),
                permalinks = this.$('#permalinks').is(':checked') ? '/:year/:month/:day/:slug/' : '/:slug/';

            Ghost.Validate._errors = [];
            Ghost.Validate
                .check(title, {message: "Title is too long", el: $('#blog-title')})
                .len(0, 150);
            Ghost.Validate
                .check(description, {message: "Description is too long", el: $('#blog-description')})
                .len(0, 200);
            Ghost.Validate
                .check(email, {message: "Please supply a valid email address", el: $('#email-address')})
                .isEmail().len(0, 254);
            Ghost.Validate
                .check(postsPerPage, {message: "Please use a number less than 1000", el: $('postsPerPage')})
                .isInt().max(1000);
            Ghost.Validate
                .check(postsPerPage, {message: "Please use a number greater than 0", el: $('postsPerPage')})
                .isInt().min(0);


            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {
                this.model.save({
                    title: title,
                    description: description,
                    email: email,
                    postsPerPage: postsPerPage,
                    activeTheme: this.$('#activeTheme').val(),
                    permalinks: permalinks
                }, {
                    success: this.saveSuccess,
                    error: this.saveError
                }).then(function () { self.render(); });
            }
        },
        showLogo: function (e) {
            e.preventDefault();
            var settings = this.model.toJSON();
            this.showUpload('logo', settings.logo);
        },
        showCover: function (e) {
            e.preventDefault();
            var settings = this.model.toJSON();
            this.showUpload('cover', settings.cover);
        },
        showUpload: function (key, src) {
            var self = this,
                upload = new Ghost.Models.uploadModal({'key': key, 'src': src, 'id': this.id, 'accept': {
                    func: function () { // The function called on acceptance
                        var data = {};
                        if (this.$('.js-upload-url').val()) {
                            data[key] = this.$('.js-upload-url').val();
                        } else {
                            data[key] = this.$('.js-upload-target').attr('src');
                        }

                        self.model.save(data, {
                            success: self.saveSuccess,
                            error: self.saveError
                        }).then(function () {
                            self.saveSettings();
                        });

                        return true;
                    },
                    buttonClass: "button-save right",
                    text: "Save" // The accept button text
                }});

            this.addSubview(new Ghost.Views.Modal({
                model: upload
            }));
        },
        templateName: 'settings/general',

        afterRender: function () {
            this.$('#permalinks').prop('checked', this.model.get('permalinks') === '/:slug/' ? false : true);
            this.$('.js-drop-zone').upload();
            Settings.Pane.prototype.afterRender.call(this);
        }
    });

    // ### User profile
    Settings.user = Settings.Pane.extend({
        templateName: 'settings/user-profile',

        id: 'user',

        options: {
            modelType: 'User'
        },

        events: {
            'click .button-save': 'saveUser',
            'click .button-change-password': 'changePassword',
            'click .js-modal-cover': 'showCover',
            'click .js-modal-image': 'showImage',
            'keyup .user-profile': 'handleEnterKeyOnForm'
        },
        showCover: function (e) {
            e.preventDefault();
            var user = this.model.toJSON();
            this.showUpload('cover', user.cover);
        },
        showImage: function (e) {
            e.preventDefault();
            var user = this.model.toJSON();
            this.showUpload('image', user.image);
        },
        showUpload: function (key, src) {
            var self = this, upload = new Ghost.Models.uploadModal({'key': key, 'src': src, 'id': this.id, 'accept': {
                func: function () { // The function called on acceptance
                    var data = {};
                    if (this.$('.js-upload-url').val()) {
                        data[key] = this.$('.js-upload-url').val();
                    } else {
                        data[key] = this.$('.js-upload-target').attr('src');
                    }
                    self.model.save(data, {
                        success: self.saveSuccess,
                        error: self.saveError
                    }).then(function () {
                        self.saveUser();
                    });
                    return true;
                },
                buttonClass: "button-save right",
                text: "Save" // The accept button text
            }});

            this.addSubview(new Ghost.Views.Modal({
                model: upload
            }));
        },

        handleEnterKeyOnForm: function (ev) {
            // Don't worry about it unless it's an enter key
            if (ev.which !== 13) {
                return;
            }

            var $target = $(ev.target);

            if ($target.is("textarea")) {
                // Allow enter key on user bio text area.
                return;
            }

            if ($target.is('input[type=password]')) {
                // Change password if on a password input
                return this.changePassword(ev);
            }

            // Simulate clicking save otherwise
            ev.preventDefault();

            this.saveUser(ev);

            return false;
        },

        saveUser: function () {
            var self = this,
                userName = this.$('#user-name').val(),
                userEmail = this.$('#user-email').val(),
                userLocation = this.$('#user-location').val(),
                userWebsite = this.$('#user-website').val(),
                userBio = this.$('#user-bio').val();

            Ghost.Validate._errors = [];
            Ghost.Validate
                .check(userName, {message: "Name is too long", el: $('#user-name')})
                .len(0, 150);
            Ghost.Validate
                .check(userBio, {message: "Bio is too long", el: $('#user-bio')})
                .len(0, 200);
            Ghost.Validate
                .check(userEmail, {message: "Please supply a valid email address", el: $('#user-email')})
                .isEmail();
            Ghost.Validate
                .check(userLocation, {message: "Location is too long", el: $('#user-location')})
                .len(0, 150);
            if (userWebsite.length > 0) {
                Ghost.Validate
                    .check(userWebsite, {message: "Please use a valid url", el: $('#user-website')})
                    .isUrl()
                    .len(0, 2000);
            }

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {

                this.model.save({
                    'name':             userName,
                    'email':            userEmail,
                    'location':         userLocation,
                    'website':          userWebsite,
                    'bio':              userBio
                }, {
                    success: this.saveSuccess,
                    error: this.saveError
                }).then(function () {
                    self.render();
                });
            }
        },

        changePassword: function (event) {
            event.preventDefault();
            var self = this,
                oldPassword = this.$('#user-password-old').val(),
                newPassword = this.$('#user-password-new').val(),
                ne2Password = this.$('#user-new-password-verification').val();

            Ghost.Validate._errors = [];
            Ghost.Validate.check(newPassword, {message: 'Your new passwords do not match'}).equals(ne2Password);
            Ghost.Validate.check(newPassword, {message: 'Your password is not long enough. It must be at least 8 characters long.'}).len(8);

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {

                $.ajax({
                    url: Ghost.paths.subdir + '/ghost/changepw/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                    },
                    data: {
                        password: oldPassword,
                        newpassword: newPassword,
                        ne2password: ne2Password
                    },
                    success: function (msg) {
                        Ghost.notifications.addItem({
                            type: 'success',
                            message: msg.msg,
                            status: 'passive',
                            id: 'success-98'
                        });
                        self.$('#user-password-old, #user-password-new, #user-new-password-verification').val('');
                    },
                    error: function (xhr) {
                        Ghost.notifications.addItem({
                            type: 'error',
                            message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                            status: 'passive'
                        });
                    }
                }).then(function () {
                    self.render();
                });
            }
        },

        afterRender: function () {
            var self = this;

            Countable.live(document.getElementById('user-bio'), function (counter) {
                var bioContainer = self.$('.bio-container .word-count');
                if (counter.all > 180) {
                    bioContainer.css({color: "#e25440"});
                } else {
                    bioContainer.css({color: "#9E9D95"});
                }

                bioContainer.text(200 - counter.all);

            });

            Settings.Pane.prototype.afterRender.call(this);
        }
    });

}());

/*global window, document, Ghost, Backbone, $, _, NProgress */
(function () {
    "use strict";

    Ghost.Router = Backbone.Router.extend({

        routes: {
            ''                 : 'blog',
            'content/'         : 'blog',
            'settings(/:pane)/' : 'settings',
            'editor(/:id)/'     : 'editor',
            'debug/'           : 'debug',
            'register/'        : 'register',
            'signup/'          : 'signup',
            'signin/'          : 'login',
            'forgotten/'       : 'forgotten',
            'reset/:token/'     : 'reset'
        },

        signup: function () {
            Ghost.currentView = new Ghost.Views.Signup({ el: '.js-signup-box' });
        },

        login: function () {
            Ghost.currentView = new Ghost.Views.Login({ el: '.js-login-box' });
        },

        forgotten: function () {
            Ghost.currentView = new Ghost.Views.Forgotten({ el: '.js-forgotten-box' });
        },

        reset: function (token) {
            Ghost.currentView = new Ghost.Views.ResetPassword({ el: '.js-reset-box', token: token });
        },

        blog: function () {
            var posts = new Ghost.Collections.Posts();
            NProgress.start();
            posts.fetch({ data: { status: 'all', staticPages: 'all'} }).then(function () {
                Ghost.currentView = new Ghost.Views.Blog({ el: '#main', collection: posts });
                NProgress.done();
            });
        },

        settings: function (pane) {
            if (!pane) {
                // Redirect to settings/general if no pane supplied
                this.navigate('/settings/general/', {
                    trigger: true,
                    replace: true
                });
                return;
            }

            // only update the currentView if we don't already have a Settings view
            if (!Ghost.currentView || !(Ghost.currentView instanceof Ghost.Views.Settings)) {
                Ghost.currentView = new Ghost.Views.Settings({ el: '#main', pane: pane });
            }
        },

        editor: function (id) {
            var post = new Ghost.Models.Post();
            post.urlRoot = Ghost.paths.apiRoot + '/posts';
            if (id) {
                post.id = id;
                post.fetch({ data: {status: 'all'}}).then(function () {
                    Ghost.currentView = new Ghost.Views.Editor({ el: '#main', model: post });
                });
            } else {
                Ghost.currentView = new Ghost.Views.Editor({ el: '#main', model: post });
            }
        },

        debug: function () {
            Ghost.currentView = new Ghost.Views.Debug({ el: "#main" });
        }
    });
}());
