// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Unit tests for the Zustand store (globalState.js)
// Tests: all actions and state slices in isolation
// Integration: AsyncStorage (mocked)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { renderHook, act } from '@testing-library/react-native';
import { useStore } from '../libs/globalState';
import AsyncStorage from '@react-native-async-storage/async-storage';

// â”€â”€â”€ Reset the store before every test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
beforeEach(async () => {
  await AsyncStorage.clear();
  useStore.setState({
    socket: null,
    accessToken: null,
    user: null,
    friends: null,
    typing: null,
    messages: [],
    input: '',
    currentReceiver: null,
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 1. Initial State
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Initial State', () => {
  it('should start with all values at their initial state', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.socket).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.friends).toBeNull();
    expect(result.current.typing).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe('');
    expect(result.current.currentReceiver).toBeNull();
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 2. Authentication
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Authentication', () => {
  it('setUser should save the user to the store and AsyncStorage', async () => {
    const { result } = renderHook(() => useStore());
    const mockUser = { _id: 'u1', firstName: 'Ahmed', lastName: 'Mohamed' };

    await act(async () => {
      await result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
  });

  it('setAccessToken should save the token to the store and AsyncStorage', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.setAccessToken('test-token-123');
    });

    expect(result.current.accessToken).toBe('test-token-123');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('accessToken', 'test-token-123');
  });

  it('logout should clear all data from the store and AsyncStorage', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.setUser({ _id: 'u1', firstName: 'Ahmed' });
      await result.current.setAccessToken('token');
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.currentReceiver).toBeNull();
    expect(result.current.friends).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('currentReceiver');
  });

  it('should support a login â†’ logout â†’ login cycle', async () => {
    const { result } = renderHook(() => useStore());
    const user1 = { _id: 'u1', firstName: 'Ahmed' };
    const user2 = { _id: 'u2', firstName: 'Sara' };

    await act(async () => {
      await result.current.setUser(user1);
      await result.current.setAccessToken('token1');
    });
    expect(result.current.user).toEqual(user1);

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();

    await act(async () => {
      await result.current.setUser(user2);
      await result.current.setAccessToken('token2');
    });
    expect(result.current.user).toEqual(user2);
    expect(result.current.accessToken).toBe('token2');
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 3. Friends
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Friends', () => {
  it('setFriends should assign the friends list', () => {
    const { result } = renderHook(() => useStore());
    const friends = [
      { _id: 'f1', firstName: 'Sara' },
      { _id: 'f2', firstName: 'Ali' },
    ];

    act(() => result.current.setFriends(friends));
    expect(result.current.friends).toEqual(friends);
    expect(result.current.friends).toHaveLength(2);
  });

  it('addFriend should append a new friend to the list', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setFriends([{ _id: 'f1', firstName: 'Sara' }]));
    act(() => result.current.addFriend({ _id: 'f2', firstName: 'Ali' }));

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[1].firstName).toBe('Ali');
  });

  it('updateFriend should update a friend immutably', () => {
    const { result } = renderHook(() => useStore());
    const friends = [
      { _id: 'f1', firstName: 'Sara', status: 'available' },
      { _id: 'f2', firstName: 'Ali', status: 'busy' },
    ];

    act(() => result.current.setFriends(friends));
    const originalRef = result.current.friends;

    act(() => result.current.updateFriend({ _id: 'f1', firstName: 'Sara', status: 'offline' }));

    expect(result.current.friends[0].status).toBe('offline');
    expect(result.current.friends[1].status).toBe('busy');
    // immutability check
    expect(result.current.friends).not.toBe(originalRef);
  });

  it('updateFriend should not modify the list when the id does not exist', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setFriends([{ _id: 'f1', firstName: 'Sara' }]));
    act(() => result.current.updateFriend({ _id: 'non-existent', firstName: 'Unknown' }));

    expect(result.current.friends).toHaveLength(1);
    expect(result.current.friends[0].firstName).toBe('Sara');
  });

  it('updateFriend should return a new array reference', () => {
    const { result } = renderHook(() => useStore());
    const original = [{ _id: 'f1', firstName: 'Sara' }];

    act(() => result.current.setFriends(original));
    const ref = result.current.friends;
    act(() => result.current.updateFriend({ _id: 'f1', firstName: 'Sara M.' }));

    expect(result.current.friends).not.toBe(ref);
    expect(result.current.friends[0].firstName).toBe('Sara M.');
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 4. Messages
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Messages', () => {
  it('setMessages should assign the messages list', () => {
    const { result } = renderHook(() => useStore());
    const msgs = [{ _id: 'm1', content: 'Hello' }];

    act(() => result.current.setMessages(msgs));
    expect(result.current.messages).toEqual(msgs);
  });

  it('addMessage should append a new message', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.addMessage({ _id: 'm1', content: 'Hello' }));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
  });

  it('addMessage should merge a duplicate message with the same _id', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.addMessage({ _id: 'm1', content: 'Hello', seen: false }));
    act(() => result.current.addMessage({ _id: 'm1', content: 'Hello', seen: true }));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].seen).toBe(true);
  });

  it('addMessage should replace an optimistic message when server confirms with the same clientId', () => {
    const { result } = renderHook(() => useStore());

    // optimistic message (no server _id yet)
    act(() =>
      result.current.addMessage({
        clientId: 'client-001',
        content: 'Hello',
        sender: 'u1',
        recipient: 'u2',
        seen: false,
      })
    );

    // server confirmation with same clientId
    act(() =>
      result.current.addMessage({
        _id: 'server-m1',
        clientId: 'client-001',
        content: 'Hello',
        sender: 'u1',
        recipient: 'u2',
        seen: false,
      })
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]._id).toBe('server-m1');
    expect(result.current.messages[0].clientId).toBe('client-001');
  });

  it('addMessage should add distinct messages with different clientIds', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.addMessage({ clientId: 'c1', content: 'First' }));
    act(() => result.current.addMessage({ clientId: 'c2', content: 'Second' }));

    expect(result.current.messages).toHaveLength(2);
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 5. Mark Messages Seen
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Mark Messages Seen', () => {
  it('markMessagesSeenFromSender should mark messages from a given sender as seen', () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.setMessages([
        { _id: 'm1', sender: 'u2', recipient: 'u1', seen: false },
        { _id: 'm2', sender: 'u2', recipient: 'u1', seen: false },
        { _id: 'm3', sender: 'u1', recipient: 'u2', seen: false },
      ])
    );

    act(() => result.current.markMessagesSeenFromSender('u2', 'u1'));

    expect(result.current.messages[0].seen).toBe(true);
    expect(result.current.messages[1].seen).toBe(true);
    // my outgoing messages should not be affected
    expect(result.current.messages[2].seen).toBe(false);
  });

  it('markMyMessagesSeen should mark my sent messages to a recipient as seen', () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.setMessages([
        { _id: 'm1', sender: 'u1', recipient: 'u2', seen: false },
        { _id: 'm2', sender: 'u1', recipient: 'u2', seen: false },
        { _id: 'm3', sender: 'u2', recipient: 'u1', seen: false },
      ])
    );

    act(() => result.current.markMyMessagesSeen('u1', 'u2'));

    expect(result.current.messages[0].seen).toBe(true);
    expect(result.current.messages[1].seen).toBe(true);
    // incoming messages should not be affected
    expect(result.current.messages[2].seen).toBe(false);
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 6. Typing Indicator
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Typing Indicator', () => {
  it('setTyping should store the id of the typing user', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setTyping('user-abc'));
    expect(result.current.typing).toBe('user-abc');
  });

  it('clearTyping should clear the indicator when it is the same user', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setTyping('user-abc'));
    act(() => result.current.clearTyping('user-abc'));

    expect(result.current.typing).toBeNull();
  });

  it('clearTyping should not clear the indicator when it is a different user', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setTyping('user-abc'));
    act(() => result.current.clearTyping('user-xyz'));

    expect(result.current.typing).toBe('user-abc');
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 7. Current Receiver
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Current Receiver', () => {
  it('setCurrentReceiver should save the receiver to the store and AsyncStorage', () => {
    const { result } = renderHook(() => useStore());
    const receiver = { _id: 'r1', firstName: 'Sara' };

    act(() => result.current.setCurrentReceiver(receiver));

    expect(result.current.currentReceiver).toEqual(receiver);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('currentReceiver', JSON.stringify(receiver));
  });
});

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// 8. Input Field
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

describe('Input Field', () => {
  it('setInput should assign the input value', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setInput('Hello'));
    expect(result.current.input).toBe('Hello');
  });

  it('setInput should clear the text when passed an empty string', () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setInput('some text'));
    act(() => result.current.setInput(''));

    expect(result.current.input).toBe('');
  });
});
