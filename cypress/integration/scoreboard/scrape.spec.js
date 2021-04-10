/// <reference types="cypress" />

context("scraping", () => {
  it("gets todays games", () => {
    window.$ = Cypress.$;
    console.log(window.$);

    cy.visit("https://sports.oregonlottery.org/sports/");

    cy.get(".rj-carousel-container")
      .find(".rj-carousel-item__sportName")
      .contains("Basketball")
      .click();
    cy.get(".tab-switch-btns-holder")
      .find("li")
      .contains("Upcoming")
      .parent()
      .parent()
      .click();
    cy.get(".events-container-upcoming")
      .find(".rj-ev-list__ev-card")
      .each(($el) => {
        const team1 = $el.find(".rj-ev-list__ev-card__team-1-name").text();
        const team2 = $el.find(".rj-ev-list__ev-card__team-2-name").text();

        $el
          .find(".rj-ev-list__ev-card__section--TwoBox")
          .find(".rj-ev-list__bet-btn__point")
          .each(($el2, i) => {
            if (i === 0) {
              const line1 = $el2.text();
              console.log(team1, line1);
            }
            if (i === 0) {
              const line2 = $el2.text(team2, line2);
            }
          });
      });
  });
});
