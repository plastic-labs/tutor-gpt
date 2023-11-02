import unittest
from unittest.mock import patch, MagicMock
from agent.supabasemediator import SupabaseMediator, _message_to_dict  # Replace 'your_module' with the actual module name
from langchain.schema.messages import HumanMessage

class TestSupabaseMediator(unittest.TestCase):
    def setUp(self):
        self.mock_create_client_patcher = patch('agent.supabasemediator.create_client')
        self.mock_create_client = self.mock_create_client_patcher.start()

        self.mock_client = MagicMock()
        self.mock_create_client.return_value = self.mock_client
        
        self.mediator = SupabaseMediator()
        self.mediator.memory_table = "test_memory_table"
        self.mock_create_client.assert_called()

    def tearDown(self):
        self.mock_create_client_patcher.stop()

    """Tests whether or not the constructor successfully creates a supabase client."""
    def test_init(self):
        SupabaseMediator()
        self.mock_create_client.assert_called()

    """Tests the messages API for selecting a list of messages given a request."""
    def test_messages(self):
        # Fetch instances
        mock_client = self.mock_client
        mediator = self.mediator

        # Initialize
        mock_response = MagicMock()
        mock_table = MagicMock()
        mock_eq = MagicMock()
        mock_eq2 = MagicMock()
        mock_eq3 = MagicMock()
        mock_query = MagicMock()

        # Construct
        mock_response.data = [{"message": {
            "data": {
                "content": "test_message",
                "example": False,
                "additional_kwargs": {}
            },
            "type": "human"
        }}]
        
        # Set up the chain of returns
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_eq
        mock_eq.eq.return_value = mock_eq2
        mock_eq2.eq.return_value = mock_eq3
        mock_eq3.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.execute.return_value = mock_response

        # Actions
        result = mediator.messages(session_id="test_session", user_id="test_user", message_type="test_type")
        
        # Assertions
        assert len(result) == 1
        assert result[0].content == "test_message"
        mock_client.table.assert_called_once_with("test_memory_table")
        mock_query.order.assert_called_once_with("id", desc=True)
        mock_query.execute.assert_called_once()

    """Tests whether or not the supabase insert to the memory table is called in add_message."""
    @patch('agent.supabasemediator.create_client')  
    def test_add_message(self, mock_create_client):
        
        # Setup
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_create_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        
        mediator = SupabaseMediator()
        mock_create_client.assert_called()

        session_id = "test_session"
        user_id = "test_user"
        message_type = "test_type"
        message = HumanMessage(content="hello world")  # Replace with an actual BaseMessage instance

        # Action
        mediator.add_message(session_id, user_id, message_type, message)
        
        # Assertion
        mock_client.table("memory").insert.assert_called_with({
            "session_id": session_id,
            "user_id": user_id,
            "message_type": message_type,
            "message": _message_to_dict(message)
        })

if __name__ == '__main__':
    unittest.main()