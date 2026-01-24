import { createContext, useContext, useReducer, useEffect } from 'react';
import { getAvatarColor } from '../utils/formatters';

const AppContext = createContext(null);

const STORAGE_KEY = 'splitwise_data';
const SCHEMA_VERSION = 1;

// Initial state structure
const initialState = {
  version: SCHEMA_VERSION,
  groups: {},
  expenses: {},
  settlements: {},
};

// Load state from localStorage
function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check version and migrate if needed
      if (parsed.version === SCHEMA_VERSION) {
        return parsed;
      }
      // Future: handle migrations here
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
  return initialState;
}

// Action types
const ACTIONS = {
  // Groups
  ADD_GROUP: 'ADD_GROUP',
  UPDATE_GROUP: 'UPDATE_GROUP',
  DELETE_GROUP: 'DELETE_GROUP',
  ADD_MEMBER: 'ADD_MEMBER',
  REMOVE_MEMBER: 'REMOVE_MEMBER',
  // Expenses
  ADD_EXPENSE: 'ADD_EXPENSE',
  UPDATE_EXPENSE: 'UPDATE_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
  // Settlements
  ADD_SETTLEMENT: 'ADD_SETTLEMENT',
  DELETE_SETTLEMENT: 'DELETE_SETTLEMENT',
  // Bulk
  LOAD_STATE: 'LOAD_STATE',
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_STATE:
      return action.payload;

    case ACTIONS.ADD_GROUP: {
      const { group } = action.payload;
      return {
        ...state,
        groups: {
          ...state.groups,
          [group.id]: group,
        },
      };
    }

    case ACTIONS.UPDATE_GROUP: {
      const { groupId, updates } = action.payload;
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...state.groups[groupId],
            ...updates,
            updatedAt: Date.now(),
          },
        },
      };
    }

    case ACTIONS.DELETE_GROUP: {
      const { groupId } = action.payload;
      const { [groupId]: deletedGroup, ...remainingGroups } = state.groups;

      // Also delete related expenses and settlements
      const remainingExpenses = Object.fromEntries(
        Object.entries(state.expenses).filter(([, e]) => e.groupId !== groupId)
      );
      const remainingSettlements = Object.fromEntries(
        Object.entries(state.settlements).filter(([, s]) => s.groupId !== groupId)
      );

      return {
        ...state,
        groups: remainingGroups,
        expenses: remainingExpenses,
        settlements: remainingSettlements,
      };
    }

    case ACTIONS.ADD_MEMBER: {
      const { groupId, member } = action.payload;
      const group = state.groups[groupId];
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            members: [...group.members, member],
            updatedAt: Date.now(),
          },
        },
      };
    }

    case ACTIONS.REMOVE_MEMBER: {
      const { groupId, memberId } = action.payload;
      const group = state.groups[groupId];
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            members: group.members.filter(m => m.id !== memberId),
            updatedAt: Date.now(),
          },
        },
      };
    }

    case ACTIONS.ADD_EXPENSE: {
      const { expense } = action.payload;
      return {
        ...state,
        expenses: {
          ...state.expenses,
          [expense.id]: expense,
        },
      };
    }

    case ACTIONS.UPDATE_EXPENSE: {
      const { expenseId, updates } = action.payload;
      return {
        ...state,
        expenses: {
          ...state.expenses,
          [expenseId]: {
            ...state.expenses[expenseId],
            ...updates,
            updatedAt: Date.now(),
          },
        },
      };
    }

    case ACTIONS.DELETE_EXPENSE: {
      const { expenseId } = action.payload;
      const { [expenseId]: deletedExpense, ...remainingExpenses } = state.expenses;
      return {
        ...state,
        expenses: remainingExpenses,
      };
    }

    case ACTIONS.ADD_SETTLEMENT: {
      const { settlement } = action.payload;
      return {
        ...state,
        settlements: {
          ...state.settlements,
          [settlement.id]: settlement,
        },
      };
    }

    case ACTIONS.DELETE_SETTLEMENT: {
      const { settlementId } = action.payload;
      const { [settlementId]: deletedSettlement, ...remainingSettlements } = state.settlements;
      return {
        ...state,
        settlements: remainingSettlements,
      };
    }

    default:
      return state;
  }
}

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadState);

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [state]);

  // Helper functions
  const createGroup = (name, memberNames, description = '') => {
    const now = Date.now();
    const group = {
      id: crypto.randomUUID(),
      name,
      description: description.trim(),
      members: memberNames.map(name => ({
        id: crypto.randomUUID(),
        name,
        avatarColor: getAvatarColor(name),
        createdAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: ACTIONS.ADD_GROUP, payload: { group } });
    return group;
  };

  const updateGroup = (groupId, updates) => {
    dispatch({ type: ACTIONS.UPDATE_GROUP, payload: { groupId, updates } });
  };

  const deleteGroup = (groupId) => {
    dispatch({ type: ACTIONS.DELETE_GROUP, payload: { groupId } });
  };

  const addMember = (groupId, name) => {
    const member = {
      id: crypto.randomUUID(),
      name,
      avatarColor: getAvatarColor(name),
      createdAt: Date.now(),
    };
    dispatch({ type: ACTIONS.ADD_MEMBER, payload: { groupId, member } });
    return member;
  };

  const removeMember = (groupId, memberId) => {
    dispatch({ type: ACTIONS.REMOVE_MEMBER, payload: { groupId, memberId } });
  };

  const createExpense = (groupId, description, amount, paidBy, splitType, splits) => {
    const now = Date.now();
    const expense = {
      id: crypto.randomUUID(),
      groupId,
      description,
      amount, // in cents
      paidBy,
      splitType,
      splits,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: ACTIONS.ADD_EXPENSE, payload: { expense } });
    return expense;
  };

  const updateExpense = (expenseId, updates) => {
    dispatch({ type: ACTIONS.UPDATE_EXPENSE, payload: { expenseId, updates } });
  };

  const deleteExpense = (expenseId) => {
    dispatch({ type: ACTIONS.DELETE_EXPENSE, payload: { expenseId } });
  };

  const createSettlement = (groupId, fromMemberId, toMemberId, amount) => {
    const settlement = {
      id: crypto.randomUUID(),
      groupId,
      fromMemberId,
      toMemberId,
      amount, // in cents
      createdAt: Date.now(),
    };
    dispatch({ type: ACTIONS.ADD_SETTLEMENT, payload: { settlement } });
    return settlement;
  };

  const deleteSettlement = (settlementId) => {
    dispatch({ type: ACTIONS.DELETE_SETTLEMENT, payload: { settlementId } });
  };

  // Getters
  const getGroups = () => Object.values(state.groups).sort((a, b) => b.updatedAt - a.updatedAt);

  const getGroup = (groupId) => state.groups[groupId];

  const getGroupExpenses = (groupId) =>
    Object.values(state.expenses)
      .filter(e => e.groupId === groupId)
      .sort((a, b) => b.createdAt - a.createdAt);

  const getGroupSettlements = (groupId) =>
    Object.values(state.settlements)
      .filter(s => s.groupId === groupId)
      .sort((a, b) => b.createdAt - a.createdAt);

  const value = {
    state,
    // Group actions
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
    // Expense actions
    createExpense,
    updateExpense,
    deleteExpense,
    // Settlement actions
    createSettlement,
    deleteSettlement,
    // Getters
    getGroups,
    getGroup,
    getGroupExpenses,
    getGroupSettlements,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
