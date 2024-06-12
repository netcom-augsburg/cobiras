# COBIRAS: Offering a Continuous Bit Rate Slide to Maximize DASH Streaming Bandwidth Utilization

This repository contains the testbed setup accompanying the paper **COBIRAS: Offering a Continuous Bit Rate Slide to Maximize DASH Streaming Bandwidth Utilization**. It is able to run and log metrics for DASH video streaming via the [dash.js video player](https://github.com/Dash-Industry-Forum/dash.js/).

## Prerequisites

- recent `docker` and `docker-compose` installation, as well as the `bash` shell
- ~50GB of storage
- sufficient CPU power to encode AVC up to 1440p with >1x speed (only required if you want to run JITE)
  
## Terminology

The paper uses a slightly different terminology from the code in this repository. This section lists the correspondences: Paper <--> Repository

- DASH Systems
  - FewReps <--> default (DASH system with a discrete set of 6 representations)
  - ManyReps <--> pre (DASH system with a discrete set of 49 representations, used to approximate a continuous bit rate slide, representations are pre-encoded)
  - ManyReps JITE <--> runtime (DASH system with a discrete set of 49 representations, used to approximate a continuous bit rate slide, representations are encoded just-in-time during runtime)
> Note that we use the approximation with ManyReps for practical reasons, as it is not possible to implement a fully continuous bit rate slide without major modifications to standard [dash.js](https://github.com/Dash-Industry-Forum/dash.js/) and DASH manifests.
- ABR algorithms
  - MinOff (ABR algorithm for minimizing off-phases) <--> custom (abrCustom/customBufferRule)

## Build and Run Instructions

### Prepare Video Files

Change directory to `prepare-video-files/` and execute the `prepare_video_files.sh` script:
  ```
  cd prepare-video-files
  bash prepare_video_files.sh
  ```
  The script will download the Tears of Steel (ToS) video in 4k quality (about 6.3GB) from an official mirror and encodes it to 49 different representations. Six of the representations will be used for the FewReps DASH runs (default), while the additional 43 representations will be used in the ManyReps DASH runs (pre), simulating continuous quality levels. The representations will be dashed and moved to folders in the `DASH-setup` directory. You can gather detailed ffmpeg encoding settings from the `encode()` function, as well as MP4Box dash settings from the `dash()` function.

> There is a `cleanup.sh` file, which can be used to clear the `prepare-video-files` directory.
> Depending on your machine's compute power the encoding can take a while.

### Running the Testbed

Change directory to `DASH-setup/` and execute the `exec_setup.sh` script:
  ```
  cd DASH-setup
  bash exec_setup.sh
  ```
The script will create three Docker containers via the `docker-compose.yml` file and the Dockerfiles in the `client/`, `netem/` and `server/` directories. Then, it will start playing the Tears Of Steel video on different network traces for different ABR algorithms and streaming configurations. A run with the ToS video on a network trace takes about 15 minutes, logged metrics will be saved in the `logs/` directory, grouped by the ABR algorithm used.

## Configuration

### Default Locations

|                              |                                                                 |
|------------------------------|-----------------------------------------------------------------|
| Network traces               | `DASH-setup/netem/data/trace_files`                             |
| Video files                  | `DASH-setup/server/data/public/videos/`                         |
| dash.js player configuration | `DASH-setup/server/data/public/javascripts/player.js`           |
| Code of ABR MinOff           | `DASH-setup/server/data/public/javascripts/customBufferRule.js` |
| node.js web server           | `DASH-setup/server/data/app.js`                                 |
| Logs of past runs            | `DASH-setup/logs/<ABR>/`                                        |

### Changing the Configuration

While in the current state this setup renders the test data from the mentioned paper, it can easily be adjusted to run different DASH configurations, testdata and network traces.

|                                  |                                                                                                                                                                                                                                                                                                                   |
|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Change network traces                      | Edit path of network traces in `exec_setup.sh:15`                                                                                                                                                                                                                                                                 |
| Use different video with arbitrary representation count | Create DASH segments for all video representations. Put them in a directory in `DASH-setup/server/data/public/videos/`. Edit video list in `exec_setup.sh:17`. If you want to use JITE, the node.js server must be adjusted accordingly. For example, values in `DASH-setup/server/data/static_data.json` must be adapted. Depending on your manifest structure, other adjustments might be required |
| Only run specific/different ABR algorithm | Edit ABR algorithm list in `exec_setup.sh:18`                                                                                                                                                                                                                                                                               |
| Run only JITE                              | Edit video list in `exec_setup.sh:17`. JITE can be identified by `_runtime` in the video name. `_pre` refers to ManyReps (perfect JITE, all representations are pre-encoded)                                                                                                                                                      |


