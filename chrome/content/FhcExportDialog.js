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
 * The Original Code is FhcExportDialog.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2011
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
 * Methods for the form history edit dialog.
 * Only used within FhcEntryDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcEntryDialog.xul, FhcShowDialog.js
 */
const FhcExportDialog = {
  haveSelectedHist: false,
  haveFilteredHist: false,
  haveSelectedMulti: false,
  haveFilteredMulti: false,
  
  /**
   * Initialize dialog
   */
  init: function() {
    if (window.arguments[0].inn) {
      this.haveSelectedHist = window.arguments[0].inn.haveSelectedHist;
      this.haveFilteredHist = window.arguments[0].inn.haveFilteredHist;
      this.haveSelectedMulti = window.arguments[0].inn.haveSelectedMulti;
      this.haveFilteredMulti = window.arguments[0].inn.haveFilteredMulti;
    }
    this.setChoices();
  },

  /**
   * Check/Uncheck dependent radio- and checkboxes.
   */
  setChoices: function() {
    var cbHistEnabled = (true == document.getElementById("history").checked);
    document.getElementById("historyRadiogroup").disabled = !cbHistEnabled;
    document.getElementById("selectedhist").disabled = !cbHistEnabled || !this.haveSelectedHist;
    document.getElementById("searchhist").disabled = !cbHistEnabled || !this.haveFilteredHist;
    
    var cbMultiEnabled = (true == document.getElementById("multiline").checked);
    document.getElementById("multilineRadiogroup").disabled = !cbMultiEnabled;
    document.getElementById("selectedmulti").disabled = !cbMultiEnabled || !this.haveSelectedMulti;
    document.getElementById("searchmulti").disabled = !cbMultiEnabled || !this.haveFilteredMulti;
    
    if (this._isValidSelection()) {
      document.getElementById("errorMessageNoSelection").hidden = true;
    }
  },

  /**
   * Export button activated, return parameter with selected options.
   *
   * @return {Boolean}
   *         true if at least one option is selectd.
   */
  onOkay: function() {
    if (!this._isValidSelection()) {
      document.getElementById("errorMessageNoSelection").hidden = false;
      return false;
    }

    var histWhat = "all";
    if (!document.getElementById("selectedhist").disabled) {
      histWhat = "selected";
    } else if (!document.getElementById("searchhist").disabled) {
      histWhat = "search";
    }
    
    var multWhat = "all";
    if (!document.getElementById("selectedmulti").disabled) {
      multWhat = "selected";
    } else if (!document.getElementById("searchmulti").disabled) {
      multWhat = "search";
    }

    window.arguments[0].out = {
      exportHistory      : document.getElementById("history").checked,
      exportHistoryWhat  : histWhat,
      exportMultiline    : document.getElementById("multiline").checked,
      exportMultilineWhat: multWhat,
      exportCleanupCfg   : document.getElementById("cleanup").checked,
      exportKeyBindings  : document.getElementById("keys").checked
    };
    return true;
  },
  
  /**
   * Check if at least one export is selected.
   *
   * @return {Boolean}
   *         true if at least one option is selected
   */
  _isValidSelection: function() {
    // any export selected?
    var hist  = document.getElementById("history").checked;
    var multi = document.getElementById("multiline").checked;
    var clean = document.getElementById("cleanup").checked;
    var keys  = document.getElementById("keys").checked;
    
    return hist || multi || clean || keys;
  }
}