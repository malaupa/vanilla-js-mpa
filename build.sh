#!/usr/bin/bash

# work in dist
rm -r dist || true
cp -r src dist

# get all possible included files and process them
for entry in $(find dist -type f -not -name "*.html") ; do
  # build vars to use later
  dir=$(dirname -- "$entry")
  filename=$(basename -- "$entry")
  fileHash=($(sha1sum $entry))
  # use file path and content for hashing
  hash=($(echo "$entry$fileHash" | sha1sum))
  targetFilename="${filename%.*}.${hash:0:7}.${filename##*.}"
  # rename file to match replacement
  mv "$dir/$filename" "$dir/$targetFilename"
  # replace ocurrences in each file
  for file in $(find dist -type f) ; do
    # matches [/file.ext"] or [/file.ext'] or [=file.ext ]
    sed -i "s/\(\/\|=\)$filename\(\"\|'\| \)/\1$targetFilename\2/g" $file
  done
done
