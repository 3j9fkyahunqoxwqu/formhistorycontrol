/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FhcBrowserListener.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Stephan Mahieu <stephanmahieu@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


/**
 * Provide load and unload event handlers.
 *
 * Dependencies:
 *   FhcManageFormHistoryOverlay.js
 */

const FhcManageFormHistoryOverlay = {
  observerService:        null,
  prefHandler:            null,
  dbHandler:              null,
  extPreferenceListener:  null,
  mozPreferenceListener:  null,
  oldURL:                 null,
  currentSaveFormhistory: null,
  timer:                  null,
  submitting:             false,

  init: function() {
    this.prefHandler = new FhcPreferenceHandler();
    this.dbHandler   = new FhcDbHandler();
    
    gBrowser.addProgressListener(this.locationChangeListener);
    this.extPreferenceListener = this.registerExtPrefListener();
    this.mozPreferenceListener = this.registerMozPrefListener();

    this.observerService = Components.classes["@mozilla.org/observer-service;1"]
                           .getService(Components.interfaces.nsIObserverService);
    this.observerService.addObserver(this.submitObserver, "earlyformsubmit", false);
  },

  destroy: function() {
    this._observerService.removeObserver(this, "earlyformsubmit");
    gBrowser.removeProgressListener(this.locationChangeListener);
    delete this.dbHandler;
    delete this.prefHandler;

    this.extPreferenceListener.unregister();
    delete this.extPreferenceListener;
    
    this.mozPreferenceListener.unregister();
    delete this.mozPreferenceListener;
  },

  /**
   * Check if "remember formhistory" is enabled for given URI.
   */
  isRememberEnabled: function(aURI) {
    if (!this.prefHandler.isGlobalRememberFormEntriesActive() || FhcUtil.inPrivateBrowsingMode()) {
      return false; // remember formhistory globally disabled
    }
    if (!this.prefHandler.isManageHistoryByFHCEnabled()) {
      return true; // remember formhistory globally enabled
    }
    // remember formhistory is managed by FHC
    return this.isRememberEnabledByFHC(aURI);
  },

  /**
   * Check FHC settings if "remember formhistory" is enabled for given URI.
   */
  isRememberEnabledByFHC: function(aURI) {
    //TODO check if remember formhistory for aURI is enabled or disabled
    return (aURI.spec.indexOf("com") < 0);
  },

  /**
   * Triggered when any of the formfill preferences changes.
   * Change the statusbar/toolbar icon according to the current formfill status.
   */
  onPrefsChange: function(prefName) {
    // ignore prefchanges while submitting
    if (!this.submitting) {
      this.setStatusIcon();
    }
  },

  /**
   * Triggered when a new tab (with a different URI) is selected.
   * Change the statusbar/toolbar icon according to the current formfill status.
   */
  onSelectNewURL: function(aURI) {
    if (this.submitting) {
      dump("\n=== onSelectNewURL, restoring global pref back to " + this.currentSaveFormhistory + "...\n\n");
      // restore original preference
      this.prefHandler.setGlobalRememberFormEntriesActive(this.currentSaveFormhistory);
      this.cancelRunAfterTimeout();
      this.submitting = false;
      this.currentSaveFormhistory = null;
    }

    if (aURI.spec == this.oldURL)
      return;
    this.oldURL = aURI.spec;
    this.setStatusIcon();
  },

  /**
   * When formhistory is managed by Form History Control, change the global
   * "remember formhistory" preference just prior to submit, in order to save or
   * not-save the submitted form data according to FHC's custom preferences.
   *
   * This method is triggered early when a form is in the process of being
   * submitted, thus submitting might be cancelled along the way so we have
   * to make sure to restore all temporarily changed preferences.
   */
  onFormSubmit: function() {
    dump("\n=== onFormSubmit ===\n");
    if (this.prefHandler.isManageHistoryByFHCEnabled() && !FhcUtil.inPrivateBrowsingMode()) {
      dump("- ManageByFHC is enabled.\n");
      var URI = gBrowser.selectedBrowser.currentURI;

      dump("- Checking if 'remember formhistory' should be enabled...\n");
      dump("- URL current tab = [" + URI.spec + "]\n");
      dump("- Current setting Mozilla formfill.enable=" + this.prefHandler.isGlobalRememberFormEntriesActive() + "\n");

      if (!this.submitting) {
        // remember current setting
        // restore setting after submit is typically triggered by onSelectNewURL
        this.submitting = true;
        this.currentSaveFormhistory = this.prefHandler.isGlobalRememberFormEntriesActive();

        var doSaveFormhistory = this.isRememberEnabled(URI);
        this.prefHandler.setGlobalRememberFormEntriesActive(doSaveFormhistory);
        dump("- setting global remember pref to " + this.prefHandler.isGlobalRememberFormEntriesActive() + " prior to submit\n");

        // restore setting when onSelectNewURL is not triggered after submit
        // which may occur if the submit is cancelled during event bubbling
        this.runAfterTimeout(
          function(){
            FhcManageFormHistoryOverlay.onFormSubmitDone();
          }, 1000
        );
      }
      dump("\n");
    }
  },

  onFormSubmitDone: function() {
    dump("...onFormSubmitDone...\n");
    if (this.submitting) {
      dump("- still submitting, restoring global setting\n\n");
      this.submitting = false;
      if (this.currentSaveFormhistory)  {
        this.prefHandler.setGlobalRememberFormEntriesActive(this.currentSaveFormhistory);
        this.currentSaveFormhistory = null;
      }
      this.cancelRunAfterTimeout();
    }
  },

  /**
   * Change the icon to reflect the current formfill status.
   */
  setStatusIcon: function() {
    dump("=== setStatusIcon ===\n");
    if (!this.prefHandler.isGlobalRememberFormEntriesActive() || FhcUtil.inPrivateBrowsingMode()) {
      // remember formhistory globally disabled
      dump("- Remember formhistory globally disabled\n");
      this.setIcons("neversave");
    }
    else if (!this.prefHandler.isManageHistoryByFHCEnabled()) {
      // remember formhistory globally enabled
      dump("- Remember formhistory globally enabled\n");
      this.setIcons(null); // default icon
    } else {
      // remember formhistory  managed by FHC
      var URI = gBrowser.selectedBrowser.currentURI;
      dump("- ManageByFHC enabled URI[" + URI.spec + "]\n");
      if (this.isRememberEnabledByFHC(URI)) {
        this.setIcons("dosave");
      } else {
        this.setIcons("nosave");
      }
    }
  },

  /**
   * Set the icon for the statusbar and toolbar.
   *
   * @param state {String}
   *        the attribute which selects the icon in css, null for no attribute
   */
  setIcons: function(state) {
    var sbMenu = document.getElementById("formhistctrl-statusbarmenu");
    var tbMenu = document.getElementById("formhistctrl-toolbarbutton");
    if (state) {
      sbMenu.setAttribute("savestate", state);
      tbMenu.setAttribute("savestate", state);
    } else {
      sbMenu.removeAttribute("savestate");
      tbMenu.removeAttribute("savestate");
    }
  },

  /**
   * Register a listener to act upon relevant extension preference changes.
   */
  registerExtPrefListener: function() {
    var preferenceListener = new FhcUtil.PrefListener("extensions.formhistory.",
      function(branch, name) {
        switch (name) {
          case "manageFormhistoryByFHC":
               // adjust local var to reflect new preference value
               FhcManageFormHistoryOverlay.onPrefsChange(name);
               break;
        }
      });
    preferenceListener.register();
    return preferenceListener;
  },
  
  /**
   * Register a listener to act upon relevant mozilla preference changes.
   */
  registerMozPrefListener: function() {
    var preferenceListener = new FhcUtil.PrefListener("browser.formfill.",
      function(branch, name) {
        switch (name) {
          case "enable":
               // adjust local var to reflect new preference value
               FhcManageFormHistoryOverlay.onPrefsChange(name);
               break;
        }
      });
    preferenceListener.register();
    return preferenceListener;
  },

  /**
   * Invoke a callBackFunction after a specified no of milliseconds.
   *
   * @param callBackFunc {Function}
   * @param timeMillisec {Number}
   */
  runAfterTimeout: function(callBackFunc, timeMillisec) {
    var event = {
      notify: function(timer) {callBackFunc();}
    }

    if (this.timer == null) {
      this.timer = Components.classes["@mozilla.org/timer;1"]
                    .createInstance(Components.interfaces.nsITimer);
    } else {
      this.timer.cancel();
    }
    this.timer.initWithCallback(
       event,
       timeMillisec,
       Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },

  /**
   * Stop timer if still running and cleanup.
   */
  cancelRunAfterTimeout: function() {
    if (this.timer) {
      this.timer.cancel();
      this.timer = null;
    }
  },

  /**
   * Observer object for FormSubmit events.
   */
  submitObserver: {
    QueryInterface: function(aIID) {
//     if (aIID.equals(Components.interfaces.nsIObserver) ||
//         aIID.equals(Components.interfaces.nsIFormSubmitObserver) ||
//         aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
//         aIID.equals(Components.interfaces.nsISupports))
//       return this;
     if (aIID.equals(Components.interfaces.nsIFormSubmitObserver))
       return this;
     throw Components.results.NS_NOINTERFACE;
    },

    // nsFormSubmitObserver
    notify : function (formElement, aWindow, actionURI) {
      // do not trigger at browser startup
      if (actionURI && actionURI.spec.indexOf("http://www.browserscope.org/beacon") != 0) {
//        dump("\n\n==================\nEarly form submit!\n==================\n");
//        dump("- formElement [" + formElement + "]\n");
//        dump("- aWindow     [" + aWindow + "]\n");
//        dump("- actionURI   [" + actionURI.spec + "]\n");
        FhcManageFormHistoryOverlay.onFormSubmit();
      }
      return true; // return true or form submit will be canceled.
    }
  },

  locationChangeListener: {
    QueryInterface: function(aIID) {
     if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
         aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
         aIID.equals(Components.interfaces.nsISupports))
       return this;
     throw Components.results.NS_NOINTERFACE;
    },

    onLocationChange: function(aProgress, aRequest, aURI) {
      FhcManageFormHistoryOverlay.onSelectNewURL(aURI);
    },

    onStateChange: function(a, b, c, d) {},
    onProgressChange: function(a, b, c, d, e, f) {},
    onStatusChange: function(a, b, c, d) {},
    onSecurityChange: function(a, b, c) {}
  }
}

// call handleEvent method for the following events:
window.addEventListener("load",
  function() {
    FhcManageFormHistoryOverlay.init();
    removeEventListener("load", arguments.callee, false);
  },
  false
);

window.addEventListener("unload",
  function() {
    FhcManageFormHistoryOverlay.destroy();
    removeEventListener("unload", arguments.callee, false);
  },
  false
);