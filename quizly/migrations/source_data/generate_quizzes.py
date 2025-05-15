"""
This script generates quizzes in JSON format for the Quizly application.

*** You do not need to run this script unless you want to generate quizzes for a new category. ***

To use this file, first add categories to the categories.json file in the same directory.
The script will read the categories from the file and generate quizzes for each category.
The generated quizzes will be saved in the quizzes folder in JSON format.

You need to be running Ollama locally for this script to work, and ideally downloaded
the gemma3 model first.  If you do not download the model first, then it will be downloaded
when you run the script, which will take a while. The model is about 10GB in size.

You can download the model with Ollama by running this command in the terminal:
   
  ollama pull gemma3:12b

Once this script has completed, then when the Django migrations are run, the JSON files 
will be read and the quizzes and questions will be created in the database.
"""

import re, os, json, random, unicodedata
from pathlib import Path
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate


# Create a prompt template for generating quizzes and questions
PROMPT_TEMPLATE = ChatPromptTemplate.from_template("""
You are a quiz generator. 
Create a unique multiple choice quiz in the category "{category}" that does not duplicate any of these quiz names: {existing_titles}.

The quiz should include:
1. A unique and creative name.
2. A short description (2-4 sentences).
3. A list of {num_questions} multiple choice questions, each with:
    - Question text
    - A hint to show the user if they ask for help
    - 4 answer options
    - The correct option number (1, 2, 3, or 4) for the solution
                                                   
You must use this list of correct option numbers for the solutions: {correct_options}, each question you generate will use the next number in the list for the solution.
The questions should be challenging and engaging, suitable for a quiz format. 
The quiz should be in English.
Make sure to include a variety of topics within the category. 
The quiz should be fun and interesting, with a good mix of easy and hard questions.                                                

Return the quiz in JSON format following this structure:
{{
  "name": "...",
  "description": "...",
  "questions": [
    {{
      "text": "...",
      "hint": "...",
      "option1": "...",
      "option2": "...",
      "option3": "...",
      "option4": "...",
      "solution": "..."
    }},
    ...
  ]
}}
    
Return only the JSON, with no explanation or additional text. 
Do not include code blocks or any Markdown formatting.                                              
""")


def extract_json(text):
    """
    Attempt to extract the first JSON object from text.
    """
    try:
        # Extract the first {...} block
        match = re.search(r'\{[\s\S]*\}', text)

        # If a match is found, parse it as JSON
        return json.loads(match.group(0)) if match else None

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")

    return None


def normalize_to_ascii(text):
    """
    Convert Unicode characters to closest ASCII equivalent.
    """
    # Convert unicode characters to ASCII using NFKD normalization
    # and ignore characters that cannot be represented in ASCII
    if isinstance(text, str):
        return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

    # Recursively normalize lists and dictionaries    
    elif isinstance(text, list):
        return [normalize_to_ascii(item) for item in text]    
    elif isinstance(text, dict):
        return {normalize_to_ascii(k): normalize_to_ascii(v) for k, v in text.items()}
    
    # If it's neither, return the value as is
    return text


# Read categories from categories.json file
with open('categories.json', 'r') as f:
    categories_data = json.load(f)
    categories_list = list(categories_data.keys())

# Initialize the local model
llm = OllamaLLM(model="gemma3:12b")

# Output folder to save JSON files
output_path = "quizzes"
Path(output_path).mkdir(exist_ok=True)
print("Starting quiz generation...\n")

# Loop through each category and generate quizzes for that category
for category in categories_list:
    print(f"Category: {category}")

    # Create a filename for the category
    filename = os.path.join(output_path, category.replace(" ", "_").replace("&", "and") + ".json")

    # See if there is an existing file
    if os.path.exists(filename):
        
        # Load the existing JSON file if it exists
        with open(filename, "r") as f:
            data = json.load(f)
        print(f"Loaded existing file: {filename}")
    else:
        # Create a new JSON file if it doesn't exist
        data = {category: []}
        print(f"Creating new file: {filename}")

    # Get the existing quiz titles for the prompt template to ensure that
    # the generated quiz names are unique
    existing_titles = [quiz["name"] for quiz in data[category]]

    # Randomize how many quizzes to generate for this category
    num_quizzes_to_generate = random.randint(5, 15) - len(data[category])

    # If there are already 5 quizzes in the existing JSON file, or if
    # the number of quizzes to generate is less than or equal to 0,
    # skip this category
    if num_quizzes_to_generate <= 0 or len(existing_titles) >= 5:
        print("No new quizzes needed.")
        continue

    print(f"Generating {num_quizzes_to_generate} new quizzes...")

    # Generate the number of quizzes we calculated above
    for i in range(num_quizzes_to_generate):

        # Always generate either 5, 8, or 10 questions
        num_questions = random.choice([5, 8, 10])

        # Generate a list of correct option indices for the questions, so that we dont rely
        # on the model to generate them, as it's not very good at getting a random spread.
        correct_options = []
        last_correct_option = 0

        # Generate a random correct option for each question, ensuring each answer index
        # is different from the previous question's answer index
        for _ in range(num_questions):
            correct_option = random.randint(1, 4)
            while correct_option == last_correct_option:
                correct_option = random.randint(1, 4)
            last_correct_option = correct_option
            correct_options.append(correct_option)

        # Convert the list of correct options to a string for the prompt template
        correct_options_str = ", ".join(map(str, correct_options))
        print(f"Generating quiz {i + 1}/{num_quizzes_to_generate} with {num_questions} questions...")

        # Build the prompt from the prompt template and the parameters that
        # we generated above
        prompt = PROMPT_TEMPLATE.format_messages(
            category=category,
            existing_titles=existing_titles,
            num_questions=num_questions,
            correct_options=f"[{correct_options_str}]",
        )

        try:
            # Invoke the LLM with the prompt and get the response which should be in JSON format
            response = llm.invoke(prompt)
            quiz_json = extract_json(response)

            # If the response is not valid JSON, skip this quiz
            if not quiz_json:
                print(f"Failed to parse JSON from response.")
                continue

            # Convert all Unicode characters to ASCII
            quiz_json = normalize_to_ascii(quiz_json)

            # Skip this quiz if the model generated a duplicate name
            if quiz_json["name"] in existing_titles:
                print(f"Skipped duplicate: {quiz_json['name']}")
                continue

            # Append the new quiz and save immediately
            data[category].append(quiz_json)
            existing_titles.append(quiz_json["name"])
            print(f"Added quiz: {quiz_json['name']}")

            # Save updated file immediately after each quiz
            with open(filename, "w") as f:
                json.dump(data, f, indent=4)
            print(f"Saved updated file: {filename}")

        except Exception as e:
            # If we get an error, print it and the response so we can see what went wrong
            # and continue to the next quiz
            print(f"Error generating quiz: {e}")
            print(f"Raw response:\n{response}...\n")
            continue

# All quizzes have been generated and saved
print("Quiz generation complete.")
