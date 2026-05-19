# Google Calendar Tab
Unofficial Google Calendar add-on for Thunderbird, it adds a button in Spaces that opens a Google Calendar tab in Thunderbird.
The [home page](https://addons.thunderbird.net/en-US/thunderbird/addon/google-calendar-spaces-tab/) of the extension contains the latest code.

#### Installing 
A new Google Calendar icon should appear in the Spaces Toolbar of Thunderbird. Click to open.

#### Installing from sources
Download the repository, zip it, rename it to Google-Calendar-Tab.xpi and choose install addon from file in Thunderbird.

In linux the xpi file can be created with the following commands
* `git clone https://github.com/feranick/Thunderbird-Google-Calendar-Tab`
* `cd ./Thunderbird-Google-Calendar-Tab`
* `VERSION=$(cat ./manifest.json | jq --raw-output '.version')`
* `zip -r "../Google-Calendar-Tab-${VERSION}-tb.xpi" *`
