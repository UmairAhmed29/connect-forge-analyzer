// Sample descriptors so a visitor can see a real report without hunting for their own.
// Generated from ../samples by hand; they exercise the interesting paths (staticContentMacros,
// blueprints, unmapped locations, preview modules).

export const DEMO_CONFLUENCE = {
  "key": "com.example.docs-toolkit",
  "name": "Docs Toolkit for Confluence",
  "description": "Sample Connect descriptor exercising known migration pain points.",
  "baseUrl": "https://docs-toolkit.example.com",
  "authentication": { "type": "jwt" },
  "lifecycle": {
    "installed": "/lifecycle/installed",
    "uninstalled": "/lifecycle/uninstalled",
    "enabled": "/lifecycle/enabled",
    "disabled": "/lifecycle/disabled"
  },
  "scopes": ["READ", "WRITE", "SPACE_ADMIN"],
  "modules": {
    "staticContentMacros": [
      {
        "key": "toc-macro",
        "name": { "value": "Table of Contents" },
        "url": "/macro/toc",
        "outputType": "block",
        "bodyType": "none"
      }
    ],
    "dynamicContentMacros": [
      {
        "key": "status-macro",
        "name": { "value": "Status Badge" },
        "url": "/macro/status",
        "outputType": "inline"
      }
    ],
    "blueprints": [
      { "key": "meeting-notes-blueprint", "template": { "url": "/templates/meeting-notes" } }
    ],
    "generalPages": [
      { "key": "toolkit-home", "name": { "value": "Docs Toolkit" }, "url": "/home", "location": "system.header/left" }
    ],
    "adminPages": [
      { "key": "toolkit-admin", "name": { "value": "Toolkit Settings" }, "url": "/admin" }
    ],
    "spaceToolsTabs": [
      { "key": "space-audit", "name": { "value": "Space Audit" }, "url": "/space/audit", "location": "contenttools" }
    ],
    "contentBylineItems": [
      { "key": "byline-freshness", "name": { "value": "Freshness" }, "tooltip": { "value": "Page freshness" } }
    ],
    "confluenceContentProperties": [
      { "key": "toolkit-metadata", "name": { "value": "Toolkit Metadata" }, "keyConfigurations": [] }
    ],
    "webItems": [
      { "key": "export-action", "location": "system.content.action/primary", "name": { "value": "Export" }, "url": "/export" },
      { "key": "legacy-sidebar", "location": "system.space.sidebar/main-links", "name": { "value": "Toolkit" }, "url": "/space" },
      { "key": "orphan-item", "location": "system.some.unknown.location", "name": { "value": "Legacy" }, "url": "/legacy" }
    ],
    "webPanels": [
      { "key": "footer-tracker", "location": "atl.footer", "name": { "value": "Tracker" }, "url": "/tracker" }
    ],
    "webhooks": [
      { "event": "page_updated", "url": "/hooks/page-updated" },
      { "event": "space_removed", "url": "/hooks/space-removed" },
      { "event": "some_legacy_event", "url": "/hooks/legacy" }
    ]
  }
} as const;

export const DEMO_JIRA = {
  "key": "com.example.sprint-reporter",
  "name": "Sprint Reporter for Jira",
  "baseUrl": "https://sprint-reporter.example.com",
  "authentication": { "type": "jwt" },
  "scopes": ["READ", "WRITE"],
  "modules": {
    "jiraDashboardItem": { "key": "sprint-gadget", "name": { "value": "Sprint Gadget" }, "url": "/gadget" },
    "jiraIssueFields": [{ "key": "story-points", "name": { "value": "Story Points" }, "type": "number" }],
    "jiraWorkflowPostFunctions": [{ "key": "notify-pf", "name": { "value": "Notify" }, "triggered": { "url": "/pf" } }],
    "webPanels": [
      { "key": "left-panel", "location": "atl.jira.view.issue.left.context", "name": { "value": "Details" }, "url": "/panel" },
      { "key": "right-panel", "location": "atl.jira.view.issue.right.context", "name": { "value": "Glance" }, "url": "/glance" }
    ],
    "webItems": [{ "key": "board-tool", "location": "jira.agile.board.tools", "name": { "value": "Report" }, "url": "/report" }],
    "webhooks": [{ "event": "sprint_closed", "url": "/hooks/sprint" }]
  }
} as const;
