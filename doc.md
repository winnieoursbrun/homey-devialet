 PDF To Markdown Converter
Debug View
Result View
Devialet IP Control - R1
Devialet IP Control
REFERENCE API DOCUMENTATION
Revision 1 - December 2021

Table of contents
Table of contents
Table of contents
Overview
Introduction
Color code
Minimal firmware versions
Discovery
Protocol and authentication methods
The global prefix
Request types and timeouts
General format and future compatibility considerations
GET requests
POST requests
Common parameters and fields
Subscriptions
Devices, systems, and groups
The dispatcher
Volume
Requests in /devices namespace
About devices
General information
/devices/{deviceId}
Device manipulation
/devices/{deviceId}/powerOff
/devices/{deviceId}/restart
/devices/{deviceId}/resetToFactorySettings
Requests in /systems namespace
About systems
General information
/systems/{systemId}
Sound control
/systems/{systemId}/sources/current/soundControl/volume
/systems/{systemId}/sources/current/soundControl/volumeUp
/systems/{systemId}/sources/current/soundControl/volumeDown
Audio settings
/systems/{systemId}/settings/audio/equalizer
/systems/{systemId}/settings/audio/nightMode
Other operations
/systems/{systemId}/bluetooth/startAdvertising
Device manipulation
/systems/{systemId}/powerOff
/systems/{systemId}/restart
/systems/{systemId}/resetToFactorySettings
Requests in /groups namespace
About groups
General information
Source types and stream sensing
/groups/{groupId}/sources
/groups/{groupId}/sources/current
Playback
About playback commands and states
/groups/{groupId}/sources/{sourceId}/playback/play
/groups/{groupId}/sources/current/playback/pause
/groups/{groupId}/sources/current/playback/mute
/groups/{groupId}/sources/current/playback/unmute
/groups/{groupId}/sources/current/playback/next
/groups/{groupId}/sources/current/playback/previous
Sample implementation
Error handling
Code 200 errors (regular errors)
Code 500 errors
Code 400 errors
Code 404 errors
Code 415 errors
Errors with other codes
Known issues
DOS 2.14
Document history
Overview
Introduction
StartingwithDOS2.14,Devialetdevicesofferawiderangeofcommandsandinformation,
made available via standard HTTP requests.

These commands can be used as a complement or a replacement to the Devialet
companion app for iOS andAndroidto enableadvancedautomation scenariosand/or
integration with other systems.

This document contains the reference API documentation. It can be usedby system
integrators and enthusiast developers alike.

Color code
[DOS >= 2.15] The minimal firmware version.
deviceId A field name.
/devices/{deviceId}/identify An endpoint.
"InvalidValue" Error codes.
GET, POST HTTP methods.

Minimal firmware versions
For each endpointor, when needed, itsparticularproperties (parameters,fields, HTTP
methods), the minimal embedded FW version is mentioned in the description.

DOS firmware family:

FW version Description
DOS 2.14.x - Support for Phantom I, Phantom II, Dialog, and Arch
List available sources and their properties, including sources of
the accessories
Select any source
Play/Pause/Mute/Unmute/Next/Previous when eligible
Volume control
Getting the system name
Playback status info
Stream metadata (artist, album, track) when eligible
DOS 2.16.x - Support for upcoming Devialet products
Launch Bluetooth pairing
Night mode setting
Equalizer
Power off, restart, reset to factory settings
Discovery
InordertousetheIPControlAPI,theclientapplicationmustknowtheIPaddressesofthe
Devialet devices present in the local network.

OnepossibilityistoconfiguretheDevialetdevicesorthenetworkrouterinsuchawaythat
the Devialet devices always use the same IP addresses, and to configure the client
application accordingly.

Ifthe clientapplication cannot usefixed IPaddresses,it is possibletodiscovertheIP
addresses of the Devialet devices in the local network using mDNS. Indeed, Devialet
devices register mDNS service instances for the _http._tcp servicetype.Hereisan
example of a scanning tool output:

$ avahi-browse -r _http._tcp

wlan0 IPv4 Living room Web Site local
= wlan0 IPv4 Living room Web Site local
hostname = [PhantomII98dB-L32Z12345TQ9A.local]
address = [192.168.1.26]
port = [80]
txt = ["path=/"]
wlan0 IPv4 Living room-ipcontrol Web Site local
= wlan0 IPv4 Living room-ipcontrol Web Site local
hostname = [PhantomII98dB-L32Z12345TQ9A.local]
address = [192.168.1.26]
port = [80]
txt = ["path=/ipcontrol/v1" "ipControlVersion=1" "manufacturer=Devialet"]
wlan0 IPv6 Living room Web Site local
= wlan0 IPv6 Living room Web Site local
hostname = [PhantomII98dB-L32Z12345TQ9A.local]
address = [192.168.1.26]
port = [80]
txt = ["path=/"]
wlan0 IPv6 Living room-ipcontrol Web Site local
= wlan0 IPv6 Living room-ipcontrol Web Site local
hostname = [PhantomII98dB-L32Z12345TQ9A.local]
address = [192.168.1.26]
port = [80]
txt = ["path=/ipcontrol/v1" "ipControlVersion=1" "manufacturer=Devialet"]
The client application should use the content of the txt recordto filter the service
instances. In particular, it has to contain the following key-value pairs:

"manufacturer=Devialet"
"ipControlVersion=1"
Then,itshouldusetheprovidedaddress,port,andpath(inthetxtrecord)valuesto
access the API.

Note:theclientapplicationshouldnotusethemDNSservicenamefordisplaypurposes,
butratherthesystemNamevaluefromtheresponsetothecallto/systems/{systemId}
(see below). Indeed, mDNS automatic name conflict resolution may interfere with the
service name value in unexpected ways.

Onemaynoticethatunlikevarioususer-friendlydevicenames,thehostnameparameter
doesnotchangeevenifthenameofthedeviceoritssystemischanged.Thefollowing
prefixes are used by Devialet devices:

PhantomI
PhantomII
Arch
Dialog
However, for future compatibility reasons, it is strongly recommended notto filterthe
records using thehostnameparameter, or use thisparameter in any way.

Toaccessthedevice’smodelnameorserialnumber,callingthe/devices/{deviceId}
endpoint (see below) is the preferred method.

Please note that in theexampleabove theIPv6recordprovides anIPv4address.This
behaviour is not guaranteed, the address entries may be in either IPv4 or IPv6 format.

Protocol and authentication methods
IP Control uses HTTP protocol. No authentication is required.

The global prefix
All requests are performed on the URLs of the form:

http://IPADDRESS/ipcontrol/v1/PATH/TO/ENDPOINT

Example:

http://192.168.1.20/ipcontrol/v1/devices/current/identify

Note: the /ipcontrol/v1 part of the URL can change in the future. Itis strongly
recommendedtousethevalueofthepathkeyofthetxtrecordofthecorresponding
mDNS service instance (see “Discovery” section above).

In the following documentation, the "http://IPADDRESS/ipcontrol/v1" prefix is
omitted for clarity.

One can use both IPv4 and IPv6 addresses.

Notethatvirtuallyallbrowsersforbidusinglink-localIPv6addressesintheaddressbar,but
they should work in command-line tools likecurl.Example:

curl -H 'Content-Type:' -X POST -d '{}' -g -
'http://[fe80::525b:c2ff:fe9c:7955%enp0s31f6]:80/ipcontrol/v1/devices/current/identify'

Request types and timeouts
All commands are simple requests / responses. The responses are provided in a
synchronousway.Theprocessingbeforetheresponseissentisallowedtotakeupto 500
msonthedevice,sotheclientapplicationshouldallowforadditionalnetworkrelateddelay
beforetriggeringthetimeout.Anadditionaldelayofatleast 500 ms(foratotaltimeoutof
1000 ms) is recommended.

There are two types of requests:

Queries,suchasgettingavalueorasetofvalues.TheyusetheGETHTTPmethod.
They are guaranteed to have no impact on the state of the controlled devices.
Commands,suchassettingavalueortriggeringanaction.TheyusethePOSTHTTP
method. They may have an impact on the state of the controlled devices.
General format and future compatibility considerations
GET requests
Inqueries,therequestbodiesmustbeempty.Inotherwords,therearenoparametersfor
queries (indeed, they are part of the request URL).

The response bodies are valid JSON objects, encoded in UTF-8.

The response may contain additional undocumented fields. They are not partof the
officiallysupportedAPIandcanevolvewithoutnotice.Theundocumentedfieldsmustbe
ignored by the client application.

POST requests
POST requests must have the HTTP header"Content-Type: application/json".

In commands, therequestbodies mustbevalid JSONobjects,encodedinUTF-8.For
commandswithnoparameters,therequestbodycanbeeitheremptyorcontainanempty
JSON object ( {} ).

Therequestbodiesmustnotcontainanyundocumentedparameters.Iftheydo,thedevice
behaviour is undefined.

However,therequestbodiesmaycontaindocumentedparametersfromthefuturerevisions
of the API. Devices incorporating older revisions of the API are guaranteed to ignore them.

Similarly, performing a requeston an undocumented endpoint willresultinundefined
behaviour,buttherequestssenttothedocumentedendpointsfromthefuturerevisionsof
theAPIare guaranteedtoresultinthe“404 NotFound”HTTPstatuscodeondevices
incorporating older revisions of the API (unless an older revision of the API already
supported the endpointin question, albeit in an undocumented way). Note: thisonly
applies to the endpoints under/ipcontrolpath.

Unlessanerror is encountered(seethecorrespondingsection),theresponsebodiesfor
POST requests contain empty JSON objects.

Common parameters and fields
Inthefollowingdocumentation,ifavalueorasettingcanbebothqueriedandset,the
corresponding POSTandGETrequestsare documentedtogether.Inthiscase,theywill
have the same request parameters and response fields, respectively.

IfinsomecasescertainfieldsareonlyavailableintheresponsestotheGETrequest,itis
documented explicitly.

AlldocumentedGETresponsefieldscanbepresentinthePOSTrequestaswell.However,
iftheyaremarkedas"(GET only)"orlistedinthe“GETresponse”sectiononly,theywill
be ignored by the device.

Subscriptions
Asynchronous access to the information (notifications) is not available yet.

Devices, systems, and groups
DevicesarephysicallyseparateDevialetproductsthatareconnectedtothelocalnetwork.It
includes individual speakers and accessories, such as Arch and Dialog.

Systemsarethesetsofoneormorespeakersthatalwayssharetheplaybackstate.Theyare
configuredintheDevialetcompanionappandaretypicallynotreconfiguredunlesssomeof
thespeakersarephysicallymovedtoanotherlocation(s).Currently,thereexisttwotypesof
systems:

solo systems (one speaker),
stereo systems (two speakers).
At any given moment, all speakers belong to exactly one system each.

Differentaudiosourcesmay behostedondifferentdevicesofthesystem.Forexample,
Bluetooth audiosourcemay behostedontheleftspeaker, andSpotify Connectaudio
source on the right speaker. Physical input audio sources, if any, are hosted onthe

correspondingdevices(forexample,“Optical-Left”audiosourceontheleftspeaker,and
“Optical - Right” audio source on the right speaker).

Moreover,systemsettingsarehostedbyasingledevice(belongingtothesystem)called
“systemleader”.Reading/queryingsystemsettingscanbedonebyaccessinganydevicein
thesystemevenintheabsenceofthesystemleader,butchangingasystemsettingrequires
the system leader to be reachable.

The selectionof the source hosts and the systemleaderis doneautomatically bythe
embedded firmware and can not be modified.

Groupsarethesetsofoneormoresystemsthatplaythesamecontentaccordingtothe
current multi-room configuration. They can be configured on-the-fly in the Devialet
companion app.

Forsomefeatures,thereisanotionofa“groupmaster”whichisadevicebelongingtothe
group.Theselectionofthegroupmasterisdoneautomaticallybytheembeddedfirmware
and can not be modified.

Atany givenmoment, allspeakersbelongto exactlyonesystemeach,andallsystems
belong to exactly one group each.

TheaccessoriessuchasArchorDialogarenotpartofanysystemorgroup.However,audio
sources they host are visible by all groups.

All Devialet devices in a given local network are collectively referred to as an installation.

The dispatcher
The device that receives the API command from the client application is called the
dispatcher. In many cases, it forwards the API command to other devices in the installation.

Volume
Alldevicesinthesamesystemsharethesamevolume.Indeed,onecanonlycreatesystems
of the devices of the same family and power rating.

Differentsystemsinthesamegroup,whileplayingthesamecontent,mayhavedifferent
volumes.Thegroupvolumeisanaggregateofindividualsystemvolumes.Whensettingthe
volume ononesystem,thevolumesof othersystems arenot modified,but thegroup
volumelevelmaychange.Whensettingthevolumeofagroup,thevolumesofallsystems
comprisingthisgroupmaychangesimultaneously.Theonlyexceptionisthecasewhere a
systemhaszerovolume,inwhichcasechangingthegroupvolumewillhavenoimpacton
the volume of this system.

Allvolumecommandsunmutethecurrentsource.Ontheotherhand,theydonotchange
theplayingState.

Requests in /devices namespace
About devices
The URLs in /devices namespace must have the following form:

/devices/{deviceId}/PATH/TO/ENDPOINT

Thecommandsin/devicesnamespaceareappliedtoasingledeviceonly.Similarly,the
queries in/devicesnamespace represent the stateof a single device only.

Theonlysupported{deviceId}todayis"current"."current"devicereferstothe
dispatcher.

General information
/devices/{deviceId}
GET, NOTIFICATION
Query general information pertaining to the designated device.

Minimal version:

DOS >= 2.
GET response:
{
deviceId: ,
systemId: (speakers only),
groupId: (speakers only),
model: ,
release:
{
version:
},
serial: ,
role: (speakers only),
deviceName:
}

deviceIdis a string containing a unique device identifierin UUIDv4 format.

systemIdisastringcontainingauniquesystemidentifierinUUIDv4format.Thisisthe
system the designated device belongs to.

Note:systemIdisonlypresentforspeakers.AccessoriessuchasArchorDialogdonot
belong to any system.

groupIdisastringcontainingauniquegroupidentifierinUUIDv4format.Thisisthegroup
the designated device belongs to (via its system).

Note:groupId isonlypresentfor speakers.AccessoriessuchasArchorDialogdonot
belong to any group.

model is a human-readable string representing the device’s model name. Note: even
thoughthemodelnamelanguageisEnglish,somenon-ASCIIcharactersmaybepresent
(for example, “Phantom I Opéra de Paris”).

release.versionisahuman-readablestringrepresentingthedevice’scurrentfirmware
version. Note: Although it is usually inthe form of “MAJOR.MINOR.PATCH”, such as
“2.14.0”,forexample,itcancontainadditionalnon-numericalinformationaswell.Itshould
only contain ASCII characters.

serialisastringrepresentingthedevice’sserialnumber.Itisusually 13 characterslong,
however, this may evolve in the future. It should only contain ASCII characters.

roleis a string representing the device’s role inthe system.

Itisonlypresentfor speakers. Possiblevaluesare:"FrontLeft","FrontRight",and
"Mono".

deviceNameisahuman-readablenon-emptystringinUTF-8format.Typically,itdescribes
thephysicallocationofthespeakersystem,suchas"Dining room"or"Kitchen",or
the source device of an accessory, such as"CD player".

GET example for an accessory:
{
"deviceId": "f42cf307-f5bb-4311-a917-1e06d404f595",
"model": "Arch",
"release":
{
"version": "2.14.2"
},
"serial": "P35V12345UX02",
"deviceName": "💿 CD Player"
}

GET example for a speaker:

{
"deviceId": "5b35aa24-e4c9-4942-a501-7b0cf5c1e892",
"systemId": "44a53d02-c69f-4a01-a0ce-1b6588b1d5b1",
"groupId": "0e985d77-8212-4b48-842b-9e102d52887e",
"model": "Phantom II 98 dB",
"release":
{
"version": "2.14.2"
},
"role": "Mono",
"serial": "P35V12345TQ9A",
"deviceName": "Kitchen"
}

Device manipulation
/devices/{deviceId}/powerOff
POST
Turn off the device.

Minimal version:

DOS >= 2.
Parameters:
none

Note: Exiting OFF mode is only possible by pressing a physical button on the device.

/devices/{deviceId}/restart
POST
Reboot the device.

Minimal version:

DOS >= 2.
Parameters:
none

The device will become unresponsive during the reboot.

/devices/{deviceId}/resetToFactorySettings
POST
Reset the device to factory settings and reboot the device.

Minimal version:

DOS >= 2.
Parameters:
none

The device will become unresponsive during the reboot.

Beware,thiswillalsoeraseallnetworkcredentials.Unlessthedeviceisconnectedtothe
local network by an Ethernet cable, it will become inaccessible.

Note: this will not roll back the firmware version.

Requests in /systems namespace
About systems
Thecommandsin/systemsnamespaceareappliedtoallaccessibledevicesthatarepart
of the designated system.

Ifsomedevices areswitchedofforinaccessibleforanotherreason(networkissuesetc.),
several scenarios are possible:

● If the command requires a system leader and the leader is...
○ ...present,thecommandiscarriedoutcorrectly.Itwillbeappliedtoother
devices as soon as the other device(s) become accessible again.
○ ...absent, the "SystemLeaderAbsent" error code is reported and the
system state is not modified.
● Ifthecommandrequiresthecurrentoradesignatedsourceandthedevicehosting
that source is...
○ ...present,thecommandiscarriedoutcorrectly.Itwillbeappliedtoother
devices as soon as the other device(s) become accessible again.
○ ...absent, the "UnreachableSource" error code is reported and the
system state is not modified.
● Inothercases,thecommandiscarriedoutonaccessibledevicesonly,exceptthe
dispatcher,andan"UnreachableDevices"errorcodeisreported.Thestateof
the devices other than the dispatcher is undefined and must be re-queried.
The queries in /systemsnamespace represent the stateof the system as a whole.

The URLs in/systemsnamespace must have the followingform:

/systems/{systemId}/PATH/TO/ENDPOINT

Theonlysupported{systemId}todayis"current".Inthiscase,therequestwillapply
to the system of the dispatcher.

General information
/systems/{systemId}
GET, NOTIFICATION
Query general information pertaining to the designated system.

Note: for (non-speaker) accessories such as Dialog or Arch, one should use
/devices/{deviceId}instead.

Minimal version:

DOS >= 2.
DOS >= 2.16 (certain fields)
GET response:
{
systemId: ,
groupId: ,
systemName: ,
availableFeatures: [DOS >= 2.16]
[
, ...
]
}

systemIdis a string containing a unique system identifierin UUIDv4 format.

groupIdisastringcontainingauniquegroupidentifierinUUIDv4format.Thisisthegroup
the designated system belongs to.

systemNameisahuman-readablenon-emptystringinUTF-8format.Typically,itdescribes
the physical location of the speaker system, such as"Dining room"or"Kitchen".

availableFeatures[DOS >=2.16] isanarray containingstrings thatidentifyvarious
features available on this system. Possible string values are:"equalizer","nightMode".

GET example:
{
"systemId": "13531594-b1c1-42c7-8d5a-18fa9e5d7cd4",
"groupId": "0e985d77-8212-4b48-842b-9e102d52887e",

"systemName": "Dining room 🍴",
"availableFeatures":
[
"equalizer",
"nightMode"
]
}

Sound control
/systems/{systemId}/sources/current/soundControl/volume
GET, POST, NOTIFICATION
Query or set the current volume for the designated system.

Minimal version:

DOS >= 2.
Parameters / fields:
{
volume:
}

volumeis the current volume of the current system,in percent (0-100).

See “Volume” section for additional details.

Example:
{
"volume": 35
}

/systems/{systemId}/sources/current/soundControl/volumeUp
POST
Increase the current volume for the designated system.

Minimal version:

DOS >= 2.
Parameters:
none

Thevolumeisincreasedbyonestep.Thestepvalueis5%ofthevolumerangeanditisnot
configurable.Ifthecurrentvolumeiscloserto100%thanthestepvalue,thenthecurrent
volume is set to 100%. If the current volume is already 100%, the request succeeds.

See “Volume” section for additional details.

/systems/{systemId}/sources/current/soundControl/volumeDown
POST
Decrease the current volume for the designated system.

Minimal version:

DOS >= 2.
Parameters:
none

Thevolumeisdecreasedbyonestep.Thestepvalueis5%ofthevolumerangeanditis
notconfigurable.Ifthecurrentvolumeiscloserto0%thanthestepvalue,thenthecurrent
volume is set to 0%. If the current volume is already 0%, the request succeeds.

See “Volume” section for additional details.

Audio settings
/systems/{systemId}/settings/audio/equalizer
GET, POST, NOTIFICATION
Query or set equalizer gains/preset for the designated system.

Minimal version:

DOS >= 2.
Parameters / fields:
{
enabled: , (GET only)
preset: ,
currentEqualization: (GET only)
{
BAND_LABEL :
{
frequency: (optional),
gain:
}, ...

},
customEqualization: (optional for POST)
{
BAND_LABEL :
{
gain:
}, ...
},
gainRange: (GET only)
{
min: ,
max: ,
stepPrecision:
},
availablePresets: (GET only)
[
, ...
]
}

enabled indicatesiftheequalizerisactive.Itcanbecomeinactiveincertainspecialaudio
processingmodesoftheproduct.Whenitisinactive,theclientapplicationmaymanipulate
all the settings asusual, but therewill benoaudibleimpact.However,for betteruser
experience,itisusuallyrecommendedtodisableequalizercontrolsinthiscase.Thisfieldis
read-only (the equalizer can not be re-enabled via this endpoint).

preset is the selection ofone of the available presets. Possible values are "flat",
"custom", and"voice".

currentEqualization provides gains and other information for all bands for the
currentlyusedequalizerpreset.Differentsystemsmayhavedifferent BAND_LABEL values.
BAND_LABEL examples include: "low", "high".

currentEqualization.frequency provides a user-facing “central frequency” (it
actually may be rounded) for the given band, in hertz. This value may be absent.

currentEqualization.gainprovidesapositiveornegativegainforthegivenband,in
steps (may be fractional).

customEqualization provides gains and other information for all bands for the
"custom" equalizer preset. The BAND_LABEL values are the same as in
currentEqualizationabove.

customEqualization.gainprovidesapositiveornegativegainforthegivenband,in
steps(maybefractional).ForPOSTrequests,itwillberoundedtothenearestauthorized
valuebythe device(inthiscase, thevaluereadback bytheclientapplicationmaybe

slightlydifferent).Ifthevalueisoutofauthorizedbounds,"InvalidValue"errorcodeis
reported.

Although these gains only have an effect whenthe"custom" presetisselected, itis
possibletochangetheirvaluesatanytime.Thestoredcustomgainvaluescanbemodified
independently from the preset. I.e., one can modify customgainvalueswhile usinga
different(non-"custom")preset.Also,modifyingjustapresetdoesnottriggeranychanges
to the stored custom gain values.

Thegainsmaybeprovidedeithersimultaneouslyforallorforsomebands(inwhichcase
the device guarantees to apply the new settings for all provided bands at the same
moment) or one by one.

Both preset and customEqualization are present in the response. However,
customEqualizationcanbeomittedinthePOSTrequest,inwhichcasethevaluesof
the gains corresponding to the"custom"preset willnot be modified.

If provided equalizer parameters alreadycorrespond to thecurrent state, the call will
succeed.

gainRange.min provides the minimal authorized value for the gain when using the
"custom"preset, in steps. It applies to all bands.

gainRange.max provides the maximal authorized value for the gain when using the
"custom"preset, in steps. It applies to all bands.

gainRange.stepPrecision provides the step precision, inarbitraryunits. Thisvalue
determines howthegainroundingoperates:thegainvaluesareroundedtothenearest
positive ornegative multipleofthestepprecision.Thisvaluecanbeusedbytheclient
applicationtoadapttheUIsoastomatchthedevicegainprecisionascloselyaspossible.
Typical values are0.1,0.25,0.5, and 1.

availablePresetsprovidesafulllistofavailableequalizerpresetsonthedesignated
system.

ForPOSTrequests,ifthesystemleaderisabsent,the"SystemLeaderAbsent"errorcode
is reported.

GET example:
{
"preset": "flat",
"currentEqualization":
{
"low":
{
"frequency": 400,

"gain": 0
},
"high":
{
"frequency": 2000,
"gain": 0
}
},
"customEqualization":
{
"low":
{
"gain": -0.
},
"high":
{
"gain": 2.
}
},
"gainRange":
{
"min": -6,
"max": 6,
"stepPrecision": 1
},
"availablePresets":
[
"flat",
"custom",
"voice"
]
}

POST example 1:
{
"preset": "custom",
"customEqualization":
{
"low":
{
"gain": 3.
},
"high":
{
"gain": 3.
}

}
}
POST example 2:
{
"preset": "flat"
}

/systems/{systemId}/settings/audio/nightMode
GET, POST, NOTIFICATION
Query or set the night mode audio rendering for the designated system.

Minimal version:

DOS >= 2.
Parameters / fields:
{
nightMode:
}

nightMode is the night mode selection. Possible values are "on" and "off". If the
selection already corresponds to the current state, the call will succeed.

ForPOSTrequests,ifthesystemleaderisabsent,the"SystemLeaderAbsent"errorcode
is reported.

Example:
{
"nightMode": "on"
}

Other operations
/systems/{systemId}/bluetooth/startAdvertising
POST
Start bluetooth advertising.

Minimal version:

DOS >= 2.
Parameters:
none

While advertising, the systemcanbe discoveredandpaired with bybluetoothdevices
trying to pair with a speaker.

The advertising will automatically turn off after 1 minute or upon a successful BT
connection.

Ifthiscommandisissuedwhileadvertisingisongoing,thetimeoutwillbesetto 1 minute
after the moment of the latest call.

If the systemcontainsseveral devices,andthedispatcher isnot thedeviceelectedto
performtheadvertising,thisendpointcanreportthe"UnreachableDevice"errorcode
in the case the advertising device can not be reached by the dispatcher.

Device manipulation
/systems/{systemId}/powerOff
POST
Turn off all the devices of the designated system.

Minimal version:

DOS >= 2.16
Parameters:
none

Note: Exiting OFF mode is only possible by pressing a physical button on each device.

/systems/{systemId}/restart
POST
Reboot all the devices of the designated system.

Minimal version:

DOS >= 2.16
Parameters:
none

The devices will become unresponsive during the reboot.

/systems/{systemId}/resetToFactorySettings
POST
Reset to factory settings and reboot all the devices of the designated system.

Minimal version:

DOS >= 2.16
Parameters:
none

The devices will become unresponsive during the reboot.

Beware,thiswillalsoeraseallnetworkcredentials.Unlessthedevicesareconnectedtothe
local network by an Ethernet cable, they will become inaccessible.

Note: this will not roll back the firmware version.

Requests in /groups namespace
About groups
Thecommandsin/groupsnamespaceareappliedtoallaccessibledevicesthatarepartof
the systems comprising the designated group.

The URLs in/groupsnamespace must have the followingform:

/groups/{groupId}/PATH/TO/ENDPOINT

Theonlysupported{groupId}todayis"current".Inthiscase,therequestwillapplyto
the group of the dispatcher (i.e. the device that receives the request).

General information
Source types and stream sensing
The following source types exist:

● Physical sources
○ "phono"(Arch only)
○ "line"(Arch only)
○ "digital_left"(Arch only)
○ "digital_right"(Arch only)
○ "optical"(Phantom I,Dialog)
○ "opticaljack"(Phantom II only)
● Non-physical sources
○ "spotifyconnect"
○ "airplay2"
○ "bluetooth"
○ "upnp"
○ "raat"
Moreover, there are two subcategories of physical sources:

● Physical sources that do not allow the detection of the stream.
● Physical sources that allow the detection (“sensing”) of the stream:
○ "digital_left"
○ "digital_right"
○ "optical"(including Dialog)
○ "opticaljack"
Note 1: despite "digital_left" and "digital_right" being physically separate
connectors, it is impossible toperform thesensingontheinput whichis not currently
configured as the active input of Arch.

All non-physical sources, as well as the physicalsourcesthat allowthe streamsensing
support the autoswitch feature (unless it is disabled from the Devialet companion app).

/groups/{groupId}/sources
GET, NOTIFICATION
Query the list of currently available sources for the designated group.

Minimal version:

DOS >= 2.14
Request parameters:
none

Response:
{
sources:
[
{
sourceId: ,
deviceId: ,
type:
}, ...
]
}

● sourceIdis a string containing a unique identifierof the source in UUIDv4 format.
● deviceIdisastringcontainingauniqueidentifierofthehostdevicein UUIDv4
format.Thehostmaybeeitheraspeakerdevice,ora(non-speaker)accessorysuch
as Dialog or Arch.
● typeisoneofthepredefinedsourcetypes(seeabove).Forspeakerstereopairs,
usedeviceIdto differentiate between the inputs ofthe left and the right speakers.
Thelistcanchangeifthegroupisreconfigured(viaDevialetcompanionapp)orifcertain
devicesbecometurnedoff,disconnectedfromthenetworkorotherwiseunreachable.Itcan
also change if Arch’s physical input configuration is changed (see below).

Physicalsourcesthatdonotallowthedetectionofthestreamarealwayspresent.Physical
sources that allow the detection(“sensing”) ofthe stream (see the “Stream sensing”
chapter) are also always present, whether there is a stream or not.

ForeachArch,therearefourpossiblesituations,dependingonitscurrentconfigurationof
the physical inputs:

● Only the"phono"source is available
● Only the"line"source is available
● Only the"digital_left"source is available
● Only the"digital_right"source is available
To change Arch configuration, one should use the Devialet companion app.

Allaccessoriesareavailableforallgroupsallthetime.However,anaccessorycanonlyplay
in one group at a given moment of time.

/groups/{groupId}/sources/current
GET, NOTIFICATION
Querythecurrentstateoftheplaybackpertainingtothedesignatedgroup,aswellasthe
current capabilities of the designated source.

Minimal version:

DOS >= 2.14
Parameters:
{
source:
{
sourceId: ,
deviceId: ,
type:

},
playingState: ,
muteState: ,
metadata: (optional)
{
artist: ,
album: ,
title: ,
coverArtUrl: (optional)
},
availableOperations:
[
, ...
]
}

sourceobjectdescribesthecurrentsource.Ifthereisnocurrentsource,thisparameteris
absent. When present, it contains the following fields:

● source.sourceIdisastringcontainingauniqueidentifierofthesourceinUUIDv4
format.
● source.deviceIdisastringcontainingauniqueidentifierofthehostdevicein
UUIDv4 format. The host may be either a speaker device or a (non-speaker)
accessory such as Dialog or Arch.
● source.typeisoneofthepredefinedsourcetypes(seeabove).Forspeakerstereo
pairs,usesource.deviceIdtodifferentiatebetweentheinputsoftheleftandthe
right speakers.
playingStateis one of the following values:"playing","paused".

muteStateis one of the following values:"muted","unmuted".

metadata object describes the current track. If the current source does not provide
metadata,theobjectmaybeabsent.Forsourcesthatprovidemetadatawhileplaying,the
metadatawillbekept(andreportedviathisendpoint)evenwhenthesourceispaused.
When present, it containsthefollowing sub-parameters(someofwhich maybe empty
strings):

● metadata.artistprovidestheartistname.Itmaybeemptyifthedataarenot
available, but the field is always present.
● metadata.albumprovidesthealbumname.Itmaybeemptyifthedataarenot
available, but the field is always present.
● metadata.title providesthetrackname. Itmaybeemptyifthedataarenot
available, but the field is always present.
● metadata.coverArtUrl provides an URL that can be used by the client
applicationtodownloadtheimageofthecoverart.Thisfieldmaybeabsentifthe
data are not available as an URL.
Reminder: All names are encoded in UTF-8.
availableOperations is an array of strings providing the listof currently available
operations on the current source. The possible values are:

● "play","pause","next","previous","seek"
Note:"mute"and"unmute"operationsarealwaysavailable.Theyarenotpresentinthis
list.

Note:thelistofavailable operationscanchangeevenifthesourceisnotchanged.For
example,"next"commandmaybecomeunavailablewhenthelastsongintheplaylistis
played or when the next operation is not allowed (for example, free Spotify accounts).

Example:
{
"source":
{
"sourceId": "213a3ed0-1fb9-4da2-bcf4-066da0f7b27e",
"deviceId": "13531594-b1c1-42c7-8d5a-18fa9e5d7cd4",
"type": "spotifyconnect"
},
"playingState": "playing",
"muteState": "unmuted",
"metadata":
{
"artist": "Michael Jackson",
"album": "Thriller",
"track": "Billie Jean",
"coverArtUrl": "https://cdn.spotify.com/covers/4729028427.png"
},
"availableOperations":
[
"play",
"pause",
"seek"
]
}

Playback
About playback commands and states
Themute/unmutecommandsandthecorrespondingplaybackstates(muted/unmuted)are
independent from the play/pausecommandsandtheirstates (playing/paused).Allfour
combinations are possible. Modifying one state does not modify the other one (i.e.,
play/pause commands have no impact on the muted/unmuted state and vice versa).

Ontheotherhand,allvolumerelatedcommandsunmutethecurrentsource(buttheyhave
no impact on the playing/paused state).

/groups/{groupId}/sources/{sourceId}/playback/play
POST
Start or resume playback of the designated source on the system and change its
playingStateto"playing".

Minimal version:

DOS >= 2.14
Parameters:
none

Ifthedesignatedsourceisnotthecurrentsourceofthegroup,itwillbeselectedfirst.The
previouscurrent source(ifany)will changeitsplayingState to"paused"(ifitisnot
already the case) and will be unselected.

Itshouldbepossibletoswitchtoandresumetheplayback(“pulltheplayback”)formost
sources.Inotherwords,allpausedsourcesmaintaintheircontextevenwhileanothersource
is playing.Ofcourse,certainsourcesalsosupportresumingtheplaybackviaanexternal
action (“push the playback” + autoswitch).

Forsourceshostedbyanaccessory,thiscallwillalsohaveaneffectofsettingthecurrent
targetfortheaccessoryinquestiontothedispatcher’ssystem(and,byextension,tothe
group the said system currently belongs to).

Ifthegroup’scurrentsourceisalreadyplayinganditmatchesthedesignatedsource,the
call will succeed.

Important note:this callmayhaveasynchronouseffects,dependingonthesource.Even
when this call reports success, the client application should use the output of the
/groups/{groupId}/sources/currentingeneralandplayingStateinparticularin
ordertoupdateitsUIstate.Ifthe“delayed”playcommandfails,therewillbenospecific

notification.Ontheotherhand,additionalplaycommandsareaccepted(forthesameor
for a different source) even if there still is an “ongoing” play command in the group.

Ifthe playrequestfails, "PlaybackNoStream"erroris reported.Thiscan happen,for
example:

● If there is no cable on an input with cable sensing ("opticaljack").
● If there is no lock on a digital input ("digital_left", "digital_right",
"optical". Does not apply to"opticaljack"(PhantomII)).
● If the audio session hasbeen interruptedandcould notbere-established (torn
downAirPlaysessionorunreachableAirPlaysource,unreachableBluetoothsource,
unreachableUPnP server,unreachableRoonReadycontroller,expired,revokedor
otherwise invalidated Spotify Connect token or unreachable Spotify server).
● If the detected format on a digital input is not supported.
If this happens, the designated source will still become / remain current (with no sound).

Warning:Because ofanindependentimplementation ofmulti-roomgrouping byApple
AirPlay 2 andRoonReady,selectinganAirPlay2orRoonReadysourcewillautomatically
excludethesource’shostsystemfromitscurrentgroup.Ifthesystemisaloneinitsgroup,it
willcreateanewgroup(andchangeitsgroupId),anddosooneverynewaudiosession.If
thegroupmasterwasinthesysteminquestion,thegroupisdestroyedcompletely(allits
accessible constituent systems will move to its own separate groups).

/groups/{groupId}/sources/current/playback/pause
POST
Pauseplayback ofthecurrent sourceonthesystem andchange itsplayingState to
"paused", or mute the current source if pausing isnot supported semantically.

Minimal version:

DOS >= 2.14
Parameters:
none

If the system is already paused, the call will succeed.

All sources support the “Pause” command.

Note: although certain sources can not semantically support the “Pause” command
(example:"optical"),theywillacceptthe“Pause”commandandmutethesoundoutput
instead. Note that in this case,the playingState willremain "playing", and the
muteStatewill be changed to"muted".

/groups/{groupId}/sources/current/playback/mute
POST
Mute the playback ofthecurrent source onthe systemandchangeitsmuteState to
"muted".

Minimal version:

DOS >= 2.14
Parameters:
none

If the system is already muted, the call will succeed.

/groups/{groupId}/sources/current/playback/unmute
POST
UnmutetheplaybackofthecurrentsourceonthesystemandchangeitsmuteStateto
"unmuted".

Minimal version:

DOS >= 2.14
Parameters:
none

If the system is already unmuted, the call will succeed.

/groups/{groupId}/sources/current/playback/next
POST
Start playback of the next track.

Minimal version:

DOS >= 2.14
Parameters:
none

If the current source does not have the “Next” command,
"PlaybackOperationNotAvailable"error code is reported.

/groups/{groupId}/sources/current/playback/previous
POST
Start playback of the previous track.

Minimal version:

DOS >= 2.14
Parameters:
none

If the current source does not have the “Previous” command,
"PlaybackOperationNotAvailable"error code is reported.

Someclientapplicationsmaywanttoimplementaspecial“restartcurrenttrack”logicwhen
theuserpressesthe“Previous”buttonintheUIwhilebeinginthemiddleofthetrack.Such
higherlevellogicisnotsupportedbythisendpointandmustbeimplementedintheclient
application.

Sample implementation
TheseinstructionsapplytothelatestversionoftheIPControl.Foravailabilityofindividual
endpoints or fields, please refer to the corresponding sections.

Theclientapplicationmayperformthefollowingstepstoobtainafullstateofthedevices
in the installation:

Performnetworkdiscovery.ConstructalistofallvisibleDevialetdevicesandtheirIP
addresses.
Iterate over all discovered devices:
a. Perform/devices/currentcall on each device.
b. For eachdevice,memorizeitssystemandgroupids,and(optionally)their
firmware version and serial numbers.
c. For accessories only, memorize their names.
Construct a list of discovered systems and groups.
Iterate over all discovered systems:
a. Perform/systems/currentcall on one device from eachsystem.
b. For each system, memorize its name such as “Dining Room” etc.
Iterate over all discovered groups:
a. Perform/groups/current/sourcescallononedevicefromeachgroup.
All available sources for this group will be listed.
b. Perform /groups/current/sources/current call ononedevice from
each group. The current playback state will be received.
On groups or systems of interest:
a. Perform
/{groups,systems}/current/sources/current/soundControl/vo
lumecall to get the current volume.
Afterthat,theclientapplicationcanpresentafullinstallationstatetotheuser.Inorderto
control various devices, the following operations can be performed:
● Playback commands on a group
● Sound control (volume) commands on a system
● [DOS >= 2.16]Audio setting (EQ, night mode) commandson a system

Inordertoshowuptodateinformation,theclientapplicationmaysubscribetoorperform
regular polling on the following endpoints:
● /groups/current/sources(the list of all availablesources)
● /groups/current/sources/current(the current playbackstate)
● /systems/current/sources/current/soundControl/volume (the current
volume for the system)
● /groups/current/sources/current/playback/position (the position
within the current track)

Error handling
Code 200 errors (regular errors)
Incaseofaregularerror,theresponsewillhavethe“200OK”statuscode.Theresponse
body will be a JSON:

{
error:
{
code: ,
details: (optional),
message: (optional)
}
}
error.codeisoneofthepredefinederroridentifiers.Iftheclientapplicationencounters
anunknowncode(thismayhappenwhenthefirmwareisupdated,butnottheapplication),
it must process it and show a generic error message.

error.details’scontent,ifpresent,dependsontheerroridentifier.Typically,theseare
additionalstructureddatathatcanbeusedforformattingauser-facingerrormessagein
any language supported by the front end application.

error.message,ifpresent,isprovidedfordebugpurposesonly.Itisnotrecommended
to show it to the user or process it in any way other than logging for debugging purposes.

The common errors are:
● "Error"is a generic error with no available details.
● "UnreachableDevices"for allrequeststhat requirecommunication withother
devices. Depending on the request, it can beeithercompletely abandoned, or
carried out partially (on certain devices only).
● "Timeout"ifarequestcouldnotbecarriedoutintheallottedtime.Theresulting
state is undefined and should be re-queried.
● If a request starting by /groups/{groupId}/sources/current or
/systems/{systemId}/sources/currentisperformed,butthereisnocurrent
source, the"NoCurrentSource"error code is reported.
● Whensettingavalue,iftheprovidedvaluehasincorrecttype,format,isnotpartof
thepredefinedlistofallowed values,orisoutofrange,"InvalidValue"error
code is reported, unless there isanexplicitly definederror code(e.g.,too-long
strings).Note:whenprovidingafractionalnumberwhenanintegerisexpected,the
device will round the value to the nearest integer and will not report an error.

Code 500 errors
Incaseofanexception(unexpectederror),theresponsewillhavethe“500InternalServer
Error”statuscode.Themessagebody,ifpresent,willbeaJSONfollowingthesameformat
astheoneforthe“200OK”statuscodepresentedabove.However,itscontentisnotpart
of the officially supported API and can evolve without notice.

Such errors should not occur on a correctly functioning device.

Code 400 errors
IncaseofamalformedJSONrequest,theresponsewillhavethe“400BadRequest”status
code. The message body will be empty.

Such errors should not occur if the client application is implemented correctly.

Code 404 errors
Incaseof anon-existingendpoint,theresponse willhave the“404NotFound”status
code. The message body will be empty.

Such errors should not occur if the client application is implemented correctly.

Note: incorrect{sourceId}value will result in acode 200 error, see above.

Examples:
● A request starting by/systems/currentis performedon an accessory
● A request starting by/groups/currentis performedon an accessory

Code 415 errors
The “415 Unsupported Media Type” status code will be issued if an invalid
"Content-Type"headervalueisprovidedinthePOSTrequest.Theonlyallowedvalueis
"application/json". The same error will occur if thisheader is omitted.

Such errors should not occur if the client application is implemented correctly.

Errors with other codes
Anyotherstatuscodesmustbeinterpretedasanunexpectedinternalerror,similartothe
“500InternalServerError”statuscode.TheyarenotpartoftheofficiallysupportedAPIand
can evolve without notice.

Such errors should not occur on a correctly functioning device.

Known issues
DOS 2.14
The following issues have been identified in DOS 2.14.x.

● availableOperationspropertyof/groups/{groupId}/sources/currentis
notcorrectfortheUPnPsource(listing“Previous”and“Next”operationswhenthey
maynotbeactuallyavailable).Moreover,the“Previous”and“Next”operationsfor
theUPnPsourcein/groups/{groupId}/sources/current/playbackdonot
work as expected.
● release.versionproperty of/devices/{deviceId}isincorrect.
● WhenaPOSTusesaninvalidnumericalvalue,the"InvalidValue"errorcodeis
not implemented.
These issues are fixed in DOS 2.16.x.

Document history
Revision 1 - December 2021
The initial version, covering DOS 2.14 and upcoming DOS 2.16.


This is a offline tool, your data stays locally and is not send to any server!
Feedback & Bug Reports