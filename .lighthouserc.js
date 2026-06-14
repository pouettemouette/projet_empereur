module.exports = {
  ci: {
    collect: {
      startServerCommand: "python3 -m http.server 4173",
      startServerReadyPattern: "Serving HTTP",
      url: [
        "http://localhost:4173/",
        "http://localhost:4173/salle.html",
        "http://localhost:4173/hebergements.html",
        "http://localhost:4173/galerie.html",
        "http://localhost:4173/contact.html"
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"]
      }
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.5 }],
        "categories:accessibility": ["warn", { minScore: 0.8 }],
        "categories:best-practices": ["warn", { minScore: 0.8 }],
        "categories:seo": ["warn", { minScore: 0.8 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: "./lhci_reports"
    }
  }
};
