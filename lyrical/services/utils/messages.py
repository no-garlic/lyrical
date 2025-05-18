
class MessageBuilder:
    def __init__(self, system_prompt=None):
        self.messages = []
        if system_prompt:
            self.add_system(system_prompt)

    def add_system(self, content):
        self.messages.append({"role": "system", "content": content})

    def add_user(self, content):
        self.messages.append({"role": "user", "content": content})

    def add_assistant(self, content):
        self.messages.append({"role": "assistant", "content": content})

    def get(self):
        return self.messages
    
    def __str__(self):
        message_str = "\nMessageBuilder:\n---------------\n"
        for message in self.messages:
            message_str += f"\nrole: {message['role']}\n{message['content']}\n"
        return message_str


