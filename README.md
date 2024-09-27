# Google Calendar Tab
Unofficial Google Calendar add-on for Thunderbird, it adds a button that opens a Google Calendar tab in Thunderbird.
The [home page](https://addons.mozilla.org/thunderbird/addon/thundercalendar/) of the extension contains some pictures and reviews.

#### Installing 
A new Google Calendar icon should appear in the top-right corner of Thunderbird. Click to open.

#### Installing from sources
Download the repository, zip it, rename it to Google-Calendar-Tab.xpi and choose install addon from file in Thunderbird.

In linux the xpi file can be created with the following commands
* `git clone https://github.com/feranick/Thunderbird-Google-Calendar-Tab`
* `cd ./Thunderbird-Google-Calendar-Tab`
* `VERSION=$(cat ./manifest.json | jq --raw-output '.version')`
* `zip -r "../Google-Calendar-Tab-${VERSION}-tb.xpi" *`
