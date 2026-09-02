import { assert } from "chai";
import { PDF_BLURB_FIXTURES } from "./fixtures/pdfBlurbs";
import {
  blurbFromAttachmentText,
  isShopCopyAbstract,
} from "../src/utils/itemBlurb";
import {
  firstPdfContentText,
  isPdfFrontmatterPage,
  shouldSkipFrontmatter,
} from "../src/utils/pdfFrontmatter";

const CHAPTER = `Chapter 1
The First Bond

The infant's first bond is not a simple attachment to a caregiver. Recognition is the core of psychic life, and domination arises when that recognition fails in ordinary family life. This argument runs against the grain of drive theory, which treats the other as an object rather than as a subject who can see us in return. Children learn to survive that failure by splitting doer from done-to.`;

const BOOK_PAGES = [
  "THE BONDS OF LOVE\nJessica Benjamin\nPantheon Books\nNew York",
  "Copyright © 1988 by Jessica Benjamin\nAll rights reserved.\nISBN 0-394-55133-8\nLibrary of Congress Cataloging-in-Publication Data\nPrinted in the United States of America\n10 9 8 7 6 5 4 3 2 1",
  "Contents\nPreface .................... ix\n1. The First Bond .......... 1\n2. Recognition ............. 27\n3. Gender .................. 51",
  "Acknowledgements\nI am grateful to many colleagues who read drafts of this book over several years and offered comments that improved the argument in countless small ways.",
  CHAPTER,
].join("\f");

const IMPRINT_LEAD = /isbn-1[03]|all rights reserved|library of congress/i;

describe("pdf frontmatter", function () {
  it("treats title, copyright, TOC, and acknowledgements as frontmatter", function () {
    assert.isTrue(isPdfFrontmatterPage("THE BONDS OF LOVE\nJessica Benjamin"));
    assert.isTrue(
      isPdfFrontmatterPage(
        "Copyright © 1988\nAll rights reserved.\nISBN 0-394-55133-8",
      ),
    );
    assert.isTrue(
      isPdfFrontmatterPage(
        "Contents\nPreface .................... ix\n1. The First Bond .......... 1\n2. Recognition ............. 27\n3. Gender .................. 51\n4. Conclusion .............. 80",
      ),
    );
    assert.isTrue(
      isPdfFrontmatterPage(
        "Acknowledgements\nI am grateful to many colleagues who read drafts of this book over several years and offered comments that improved the argument in countless small ways.",
      ),
    );
    assert.isFalse(isPdfFrontmatterPage(CHAPTER));
  });

  it("skips archive chrome on webpages as well as books", function () {
    assert.isTrue(shouldSkipFrontmatter("book"));
    assert.isTrue(shouldSkipFrontmatter("webpage"));
    assert.isTrue(shouldSkipFrontmatter("blogPost"));
    assert.isFalse(shouldSkipFrontmatter("journalArticle"));
  });

  it("selects the first chapter page from form-feed PDF text", function () {
    const content = firstPdfContentText(BOOK_PAGES);
    assert.include(content, "infant");
    assert.notInclude(content.toLowerCase(), "isbn");
    assert.notInclude(content.toLowerCase(), "all rights reserved");
  });

  it("skips a leading imprint when pages are not broken", function () {
    const blob = [
      "The Bonds of Love",
      "Copyright © 1988 by Jessica Benjamin. All rights reserved. ISBN 0-394-55133-8. Printed in the United States of America.",
      "Contents\nChapter 1 .......... 1\nChapter 2 .......... 27",
      CHAPTER,
    ].join("\n\n");
    const blurb = blurbFromAttachmentText(blob, { skipFrontmatter: true });
    assert.include(blurb, "infant");
    assert.notMatch(blurb, /ISBN/i);
  });

  it("does not treat a journal abstract as something to skip", function () {
    const article =
      "Journal of Housing 12(3)\nThis chapter argues that housing is infrastructure for everyday life in cities under pressure. ";
    const blurb = blurbFromAttachmentText(article.repeat(3));
    assert.include(blurb, "housing is infrastructure");
  });

  it("rejects shop-catalog paste as an abstract standfirst", function () {
    assert.isTrue(
      isShopCopyAbstract(
        "Purchase online the PDF of What is Youth Work?, Davies, Bernard,Batsleer, Janet - Learning Matters - E-book",
      ),
    );
    assert.isFalse(
      isShopCopyAbstract(
        "Youth work is a way of working with young people that has been thought up and practised by human beings.",
      ),
    );
  });

  it("skips jammed Verso contents and lands on Presentation I", function () {
    const raw = [
      "AESTHETICS AND POLITICS",
      "ISBN-13: 978-1-84467-570-8",
      "All rights reserved.",
      "Contents",
      "Presentation I",
      "Ernst BlochDiscussing Expressionism",
      "Georg LukácsRealism in the Balance",
      "Presentation II",
      "Bertolt BrechtAgainst Georg Lukács",
      "Presentation III",
      "Theodor AdornoLetters to Walter Benjamin",
      "Presentation IV",
      "Theodor AdornoReconciliation under Duress",
      "Theodor AdornoCommitment",
      "Fredric JamesonReflections in Conclusion",
      "Notes",
      "Index",
      "Publisher’s Note",
      "The texts assembled in this volume have been selected for the coherence of their inter-relationships.",
      "Presentation I",
      "The conflict between Ernst Bloch and Georg Lukács over expressionism in 1938 forms one of the most revealing episodes in modern German letters. Its resonance is in part due to the criss-crossing of intellectual evolution and political destiny between its two protagonists. The main outlines of the career of Lukács are now well-known in the Anglo-Saxon world.",
    ].join("\n");
    const content = firstPdfContentText(raw);
    assert.include(
      content.slice(0, 200),
      "The conflict between Ernst Bloch and Georg Lukács",
    );
    assert.notInclude(
      content.slice(0, 200),
      "Theodor AdornoReconciliation under Duress",
    );
  });

  it("uses a journal ABSTRACT instead of the scanned masthead", function () {
    const raw = [
      "fuurnal 01",
      "RADICAL YOUTHWORK:",
      "CREATING A POLITICS OF MUTUAL LIBERATION FOR YOUTH AND ADULTS",
      "Hans A. Skott-Myhre",
      "Department of Child and Youth Studies Brock University, Ontario",
      "ABSTRACT: Tensions between those who believe that youth work should socialize youth and those who believe it should address youth in a liberatory practice constitute an ongoing struggle for those involved in youth work. This paper proposes youth work as a radical liberatory practice designed to subvert and overcome disciplinary social regimes.",
      "Key words: radical youth work, whiteness, liberation, post-colonial, Foucault",
      "Youth work began with the creation of adolescence.",
    ].join("\n");
    const blurb = blurbFromAttachmentText(raw);
    assert.include(blurb.slice(0, 200), "Tensions between those who believe");
    assert.notMatch(blurb.slice(0, 80), /fuurnal|RADICAL YOUTHWORK/i);
    assert.notMatch(blurb, /Key words/i);
  });

  it("skips Piaget contents and lands on the introduction", function () {
    const fixture = PDF_BLURB_FIXTURES.find(
      (item) => item.id === "play-dreams-and-imitation",
    );
    assert.ok(fixture);
    const content = firstPdfContentText(fixture.text);
    const blurb = blurbFromAttachmentText(fixture.text, {
      skipFrontmatter: true,
    });
    assert.include(content.slice(0, 200), "La Genèse du nombre");
    assert.include(blurb.slice(0, 200), "La Genèse du nombre");
    assert.notMatch(
      content.slice(0, 200),
      /Contents|CHAPTER I\. THE FIRST THREE/i,
    );
    assert.notMatch(
      blurb.slice(0, 200),
      /Contents|CHAPTER I\. THE FIRST THREE/i,
    );
  });

  it("skips contents, contributor notes, and a series-editor foreword", function () {
    const fixture = PDF_BLURB_FIXTURES.find(
      (item) => item.id === "what-is-youth-work",
    );
    assert.ok(fixture);
    const content = firstPdfContentText(fixture.text);
    const blurb = blurbFromAttachmentText(fixture.text, {
      skipFrontmatter: true,
    });
    assert.include(
      content.slice(0, 200),
      "Youth work is a way of working with young people",
    );
    assert.include(
      blurb.slice(0, 200),
      "Youth work is a way of working with young people",
    );
    assert.notMatch(
      content.slice(0, 200),
      /Notes on the contributors|Foreword from the series editors|this chapter will/i,
    );
    assert.notMatch(
      blurb.slice(0, 200),
      /Janet Batsleer is Head|Purchase online|All rights reserved/i,
    );
  });

  it("skips an Arcade also-by list and lands on Brecht's introductory note", function () {
    const raw = [
      "Works of Bertolt Brecht",
      "published by",
      "Arcade",
      "Baal",
      "The Caucasian Chalk Circle",
      "The Good Person of Szechwan",
      "Life of Galileo",
      "Mother Courage and Her Children",
      "The Threepenny Opera",
      "Contents",
      "Introductory Note",
      "The Measures Taken",
      "Introductory Note",
      "The Lehrstuck or Learning-Play",
      "The following note is excerpted from an essay by Brecht on ‘The German Drama: pre-Hitler’, published in English in Left Review, London, July 1936.",
      "Briefly the aristotelian play is essentially static; its task is to show the world as it is. The learning-play is essentially dynamic; its task is to show the world as it changes and also how it may be changed. It is a common truism among the producers and writers of the former type of play that the audience is a mob.",
    ].join("\n");
    const content = firstPdfContentText(raw);
    assert.include(
      content.slice(0, 200),
      "Briefly the aristotelian play is essentially static",
    );
    assert.notInclude(content.slice(0, 200), "Caucasian Chalk Circle");
  });

  it("skips a council letterhead and lands on the synopsis", function () {
    const raw = [
      "att Children and Young People",
      "222 Upper Street, London, N1 1XR",
      "Report of: Corporate Director of Children and Young People",
      "Meeting of: Children and Young People Scrutiny Committee",
      "Date: 15 December 2025",
      "Ward(s): All",
      "Subject: Children and Young People Quarter 1 2025/26 Performance Report",
      "1. Synopsis",
      "1.1. The council has in place a suite of corporate performance indicators to help monitor progress in delivering the outcomes set out in the council’s Corporate Plan. Progress on key performance measures is reported through the council’s Scrutiny Committees on a quarterly basis to ensure accountability to residents.",
      "2. Recommendations",
      "2.1. To review the performance data for Q1 2025/26.",
    ].join("\n");
    const content = firstPdfContentText(raw);
    assert.include(
      content.slice(0, 200),
      "The council has in place a suite of corporate performance indicators",
    );
    assert.notMatch(content.slice(0, 80), /Upper Street|Report of:/);
  });

  it("rips past frontmatter in library book extracts", function () {
    for (const fixture of PDF_BLURB_FIXTURES) {
      const content = firstPdfContentText(fixture.text);
      const blurb = blurbFromAttachmentText(fixture.text, {
        skipFrontmatter: true,
      });
      assert.include(content.slice(0, 500), fixture.include, fixture.id);
      assert.include(blurb.slice(0, 500), fixture.include, fixture.id);
      assert.notMatch(content.slice(0, 280), IMPRINT_LEAD, fixture.id);
      assert.notMatch(blurb.slice(0, 280), IMPRINT_LEAD, fixture.id);
    }
  });
});
