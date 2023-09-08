#/bin/bash

# Check if an argument was provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <input>"
  exit 1
fi

# Access the first argument (input) provided on the command line
# Specify the input .env file
input_file="$1"

# Specify the output file names for the extracted variables

variables=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_URL")

command="docker build " 

# Loop through the list and extract the environment variables
for variable in "${variables[@]}"; do
  # Construct the pattern to search for in the .env file
  pattern="${variable}="

   value=$(grep "$pattern" "$input_file" | cut -d "=" -f2)
   output_file="${variable}.txt"
   command+="--secret id=$variable,src=$output_file "
   echo "$value" > "$output_file"
   cat $output_file
done

echo "\n"

command+="-t tutor-gpt ."

echo $command

eval $command

for variable in "${variables[@]}"; do
  # Construct the pattern to search for in the .env file
  output_file="${variable}.txt"
  rm $output_file
done

# docker build \
# --secret id=NEXT_PUBLIC_SUPABASE_URL,src=variable1.txt \
# --secret id=NEXT_PUBLIC_SUPABASE_ANON_KEY,src=variable2.txt \
# --secret id=NEXT_PUBLIC_URL,src=variable3.txt \
# -t tutor-gpt .
