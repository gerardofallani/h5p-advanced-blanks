﻿import { Highlight } from "./highlight";
import { Blank } from "./blank";
import { MediaElement, MediaType } from "./media-element";
import { ClozeElement, ClozeElementType } from "./cloze-element";
import { H5PLocalization, LocalizationLabels } from "../services/localization";

/**
 * Represents the cloze. Instantiate with static createCloze().
 */
export class Cloze {
  public html: string;
  public highlights: Highlight[];
  public blanks: Blank[];

  private static normalizedBlankMarker = '___';

  private constructor() { }

  /**
   * Returns true if all blanks were entered correctly. 
   * @returns boolean
   */
  public checkCompleteness = (): boolean => {
    for (var cloze of this.blanks) {
      if (cloze.isCorrect == undefined || cloze.isCorrect === false)
        return false;
    }

    return true;
  }
  /**
   * @param  {string} html - The html string that contains the cloze with blanks marking and highlight markings.
   * @param  {Blank[]} blanks - All blanks as entered by the content author.
   * @param  {MediaElement[]} media - All media elements as entered by the content author.
   * @returns Cloze
   */
  public static createCloze(html: string, blanks: Blank[], media: MediaElement[]): Cloze {
    var orderedAllElementsList: ClozeElement[] = new Array();
    var highlightInstances: Highlight[] = new Array();
    var blanksInstances: Blank[] = new Array();

    html = Cloze.normalizeBlankMarkings(html);

    var conversionResult = Cloze.convertMarkupToSpans(html, blanks);
    html = conversionResult.html;
    orderedAllElementsList = conversionResult.orderedAllElementsList;
    highlightInstances = conversionResult.highlightInstances;
    blanksInstances = conversionResult.blanksInstances;

    Cloze.linkHighlightsObjects(orderedAllElementsList, highlightInstances, blanksInstances);

    var cloze = new Cloze();
    cloze.html = html;
    cloze.blanks = blanksInstances;
    cloze.highlights = highlightInstances;

    return cloze;
  }
  /**
   * Converts !!signal!! highlight markup and ___  blank markup into <span>...</span>.
   * Returns the resulting html string and three lists of all active elements used in the cloze:
   *    orderedAllElements: highlights and blanks in the order of appearance in the html.
   *    highlightInstances: only highlights in the order of appearance
   *    blanksInstances: only blanks in the order of appearance
   * @param  {string} html
   * @param  {Blank[]} blanks
   * @returns Lists of active elements (see description).
   */
  private static convertMarkupToSpans(html: string, blanks: Blank[]): { html: string, orderedAllElementsList: ClozeElement[], highlightInstances: Highlight[], blanksInstances: Blank[] } {
    var orderedAllElementsList: ClozeElement[] = new Array();
    var highlightInstances: Highlight[] = new Array();
    var blanksInstances: Blank[] = new Array();

    var exclamationMarkRegExp = /!!(.{1,40}?)!!/i;
    var highlightCounter = 0;
    let blankCounter = 0;

    // Searches the html string for highlights and blanks and inserts spans. 
    do {
      var nextHighlightMatch = html.match(exclamationMarkRegExp);
      var nextBlankIndex = html.indexOf(Cloze.normalizedBlankMarker);

      if (nextHighlightMatch && (nextHighlightMatch.index < nextBlankIndex) || (nextBlankIndex < 0)) {
        // next active element is a highlight
        var highlight = new Highlight(nextHighlightMatch[1], `highlight_${highlightCounter}`);
        highlightInstances.push(highlight);
        orderedAllElementsList.push(highlight);
        html = html.replace(exclamationMarkRegExp, `<span id='container_highlight_${highlightCounter}'></span>`);
        highlightCounter++;
      } else if (nextBlankIndex >= 0) {
        // next active element is a blank
        if (blankCounter >= blanks.length) {
          // if the blank is not in the repository (The content author has marked too many blanks in the text, but not entered correct answers.)
          html = html.replace(Cloze.normalizedBlankMarker, "<span></span>");
        }
        else {
          var blankInstance = blanks[blankCounter].clone();
          blankInstance.id = "blank_" + blankCounter;
          blanksInstances.push(blankInstance);
          orderedAllElementsList.push(blankInstance);
          html = html.replace(Cloze.normalizedBlankMarker, `<span id='container_${blankInstance.id}'></span>`);
          blankCounter++;
        }
      }
    }
    while (nextHighlightMatch && (nextBlankIndex >= 0));

    return {
      html: html,
      orderedAllElementsList: orderedAllElementsList,
      highlightInstances: highlightInstances,
      blanksInstances: blanksInstances
    };
  }

  /**
   * Iterates through all blanks and calls their linkHighlightIdsToObjects(...).
   * @param orderedAllElementsList 
   * @param highlightInstances 
   * @param blanksInstances 
   */
  private static linkHighlightsObjects(orderedAllElementsList: ClozeElement[], highlightInstances: Highlight[], blanksInstances: Blank[]): void {
    for (var blank of blanksInstances) {
      var nextBlankIndexInArray = orderedAllElementsList.indexOf(blank);
      var highlightsBeforeBlank = orderedAllElementsList
        .slice(0, nextBlankIndexInArray)
        .filter(e => e.type === ClozeElementType.Highlight)
        .map(e => e as Highlight)
        .reverse();
      var highlightsAfterBlank = orderedAllElementsList
        .slice(nextBlankIndexInArray + 1)
        .filter(e => e.type === ClozeElementType.Highlight)
        .map(e => e as Highlight);
      blank.linkHighlightIdsToObjects(highlightsBeforeBlank, highlightsAfterBlank);
    }
  }

  /**
   * Looks for all instances of marked blanks and replaces them with ___. 
   * @param  {string} html
   * @returns string
   */
  private static normalizeBlankMarkings(html: string): string {
    var underlineBlankRegEx = /_{3,}/g;
    html = html.replace(underlineBlankRegEx, Cloze.normalizedBlankMarker);
    return html;
  }
}