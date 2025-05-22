#!/bin/bash
#
# This script packages your project into a solution distributable that can be
# used as an input to the solution builder validation pipeline.
#
# This script will perform the following tasks:
#   1. Remove any old dist files from previous runs.
#   2. Build and synthesize your CDK project.
#   3. Move templates into the /global-s3-assets folder.
#   4. Organize source code artifacts into the /regional-s3-assets folder.

set -e && [[ "$DEBUG" == 'true' ]] && set -x

# color codes
RED="\033[0;31m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
NC="\033[00m"

# get command line arguments
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --solution-name)
      SOLUTION_NAME="$2"
      shift # past argument
      shift # past value
      ;;
    --solution-id)
      SOLUTION_ID="$2"
      shift # past argument
      shift # past value
      ;;
    --version)
      VERSION="$2"
      shift # past argument
      shift # past value
      ;;
    --dist-output-bucket)
      DIST_OUTPUT_BUCKET="$2"
      shift # past argument
      shift # past value
      ;;
    --public-ecr-registry)
      PUBLIC_ECR_REGISTRY="$2"
      shift # past argument
      shift # past value
      ;;
    --public-ecr-tag)
      PUBLIC_ECR_TAG="$2"
      shift # past argument
      shift # past value
      ;;
    --private-ecr-repo)
      PRIVATE_ECR_REPO="$2"
      shift # past argument
      shift # past value
      ;;
    --nuke-config-file-name)
      NUKE_CONFIG_FILE_PATH="$2"
      shift # past argument
      shift # past value
      ;;
    --log-level)
      LOG_LEVEL="$2"
      shift # past argument
      shift # past value
      ;;
    --deployment-mode)
      DEPLOYMENT_MODE="$2"
      shift # past argument
      shift # past value
      ;;
    -*)
      printf "%bUnknown option $1\n%b" "${RED}" "${NC}"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done

set -- "${POSITIONAL_ARGS[@]}" # restore positional parameters

# Check to see if the required parameters have been provided
if [ -z "$DIST_OUTPUT_BUCKET" ] || [ -z "$SOLUTION_NAME" ] ||  [ -z "$VERSION" ]; then
    printf "%bPlease provide trademark approved solution name, the base source bucket name, and version where the distributable will eventually reside.\n%b" "${RED}" "${NC}"
    printf "%bFor example: ./build-s3-dist.sh --dist-output-bucket solutions-bucket --solution-name trademarked-solution-name --version v0.0.0\n%b" "${RED}" "${NC}"
    exit 1
fi

# Get reference for all important folders
root_dir="$(dirname "$(dirname "$(realpath "$0")")")"
deployment_dir="$root_dir/deployment"
cdk_out_dir="$root_dir/.build/cdk.out"
global_assets_dir="$deployment_dir/global-s3-assets"
regional_assets_dir="$deployment_dir/regional-s3-assets"
ecr_dir="$deployment_dir/ecr"

printf "[Init] Remove old dist files from previous runs\n"
rm -rf "$global_assets_dir"
rm -rf "$regional_assets_dir"
rm -rf "$cdk_out_dir"

mkdir -p "$global_assets_dir"
mkdir -p "$regional_assets_dir"

printf "[Build] Building distributable assets\n"
npm run build

# Initialize empty context array
CONTEXT_FLAGS=()

# Add context flags only if variables are set
CONTEXT_FLAGS+=("--context" "solutionName=$SOLUTION_NAME")
CONTEXT_FLAGS+=("--context" "version=$VERSION")
CONTEXT_FLAGS+=("--context" "distOutputBucket=$DIST_OUTPUT_BUCKET")
[ -n "$SOLUTION_ID" ] && CONTEXT_FLAGS+=("--context" "solutionId=$SOLUTION_ID")
[ -n "$PUBLIC_ECR_REGISTRY" ] && CONTEXT_FLAGS+=("--context" "publicEcrRegistry=$PUBLIC_ECR_REGISTRY")
[ -n "$PUBLIC_ECR_TAG" ] && CONTEXT_FLAGS+=("--context" "publicEcrTag=$PUBLIC_ECR_TAG")
[ -n "$PRIVATE_ECR_REPO" ] && CONTEXT_FLAGS+=("--context" "privateEcrRepo=$PRIVATE_ECR_REPO")
[ -n "$NUKE_CONFIG_FILE_PATH" ] && CONTEXT_FLAGS+=("--context" "nukeConfigFilePath=$NUKE_CONFIG_FILE_PATH")
[ -n "$LOG_LEVEL" ] && CONTEXT_FLAGS+=("--context" "logLevel=$LOG_LEVEL")
[ -n "$DEPLOYMENT_MODE" ] && CONTEXT_FLAGS+=("--context" "deploymentMode=$DEPLOYMENT_MODE")

# Execute the command with dynamic context flags
npm run --workspace @amzn/innovation-sandbox-infrastructure cdk synth -- "${CONTEXT_FLAGS[@]}"

printf "[Packing] Moving and renaming template files\n"
for file in "$cdk_out_dir"/*.template.json; do
    filename=$(basename "$file")
    # Check if filename is in REGIONAL_TEMPLATES array
    if [ "$filename" = "InnovationSandbox-SandboxAccount.template.json" ]; then
        cp "$file" "$regional_assets_dir/$(basename "${file%.json}")"
    else
        cp "$file" "$global_assets_dir/$(basename "${file%.json}")"
    fi
done

printf "[Packing] Moving assets to regional assets dir\n"
rsync "$cdk_out_dir"/asset.* "$regional_assets_dir"

printf "[Copying] Dockerfile and code artifacts to deployment/ecr folder\n"
find "$root_dir/source" -name Dockerfile | while read file; do
    parent_dir="$(basename "$(dirname "$file")")"
    mkdir -p "$ecr_dir/$SOLUTION_NAME-$parent_dir"
    cp "$file" "$ecr_dir/$SOLUTION_NAME-$parent_dir/Dockerfile"
done

printf "%b[Done] Build script finished.\n%b" "${GREEN}" "${NC}"

printf "%bTo manually upload the files to S3 run the following commands (must replace <region>):\n%b" "${CYAN}" "${NC}"
printf "%baws s3 cp $global_assets_dir s3://$DIST_OUTPUT_BUCKET/$SOLUTION_NAME/$VERSION --recursive\n%b"  "${CYAN}" "${NC}"
printf "%baws s3 cp $regional_assets_dir s3://$DIST_OUTPUT_BUCKET-<region>/$SOLUTION_NAME/$VERSION --recursive\n%b"  "${CYAN}" "${NC}"
