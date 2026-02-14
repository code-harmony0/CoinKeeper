import firestore from '@react-native-firebase/firestore';
import {
  Query,
  DocumentData,
  WhereFilterOp,
} from '@react-native-firebase/firestore';

type WhereOptions = [string, WhereFilterOp, any];
type OrderByOptions = [string, 'asc' | 'desc'];

// Generic Firestore Service for all collections
// This will handle create, read, update, delete, and real-time listeners.

/**
 * Fetches a single document from a collection.
 * @param collectionPath - The path to the Firestore collection.
 * @param id - The ID of the document to fetch.
 * @returns The document data or null if not found.
 */
export const getDocument = async <T>(collectionPath: string, id: string): Promise<T | null> => {
  try {
    const docSnapshot = await firestore().collection(collectionPath).doc(id).get();
    if (docSnapshot.exists) {
      return { id: docSnapshot.id, ...docSnapshot.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document [${collectionPath}/${id}]:`, error);
    throw error;
  }
};

/**
 * Adds a new document to a collection.
 * @param collectionPath - The path to the Firestore collection.
 * @param data - The data for the new document.
 * @returns The newly created document with its ID.
 */
export const addDocument = async <T>(collectionPath: string, data: T): Promise<T & { id: string }> => {
  try {
    const docRef = await firestore().collection(collectionPath).add(data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error adding document to [${collectionPath}]:`, error);
    throw error;
  }
};

/**
 * Updates an existing document in a collection.
 * @param collectionPath - The path to the Firestore collection.
 * @param id - The ID of the document to update.
 * @param data - The data to merge into the document.
 */
export const updateDocument = async (collectionPath: string, id: string, data: Partial<DocumentData>): Promise<void> => {
  try {
    await firestore().collection(collectionPath).doc(id).update(data);
  } catch (error) {
    console.error(`Error updating document [${collectionPath}/${id}]:`, error);
    throw error;
  }
};

/**
 * Deletes a document from a collection.
 * @param collectionPath - The path to the Firestore collection.
 * @param id - The ID of the document to delete.
 */
export const deleteDocument = async (collectionPath: string, id: string): Promise<void> => {
  try {
    await firestore().collection(collectionPath).doc(id).delete();
  } catch (error) {
    console.error(`Error deleting document [${collectionPath}/${id}]:`, error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for a single document.
 * @param collectionPath - The path to the Firestore collection.
 * @param id - The ID of the document to listen to.
 * @param onResult - Callback function to handle the document data.
 * @param onError - Optional callback to handle errors.
 * @returns An unsubscribe function.
 */
export const onSnapshotDocument = (collectionPath: string, id: string, onResult: (data: DocumentData | null) => void, onError?: (error: Error) => void) => {
  return firestore().collection(collectionPath).doc(id).onSnapshot(
    (doc) => {
      onResult(doc.exists ? { id: doc.id, ...doc.data() } : null);
    },
    onError
  );
};

/**
 * Sets up a real-time listener for a collection with optional queries.
 * @param collectionPath - The path to the Firestore collection.
 * @param onResult - Callback function to handle the array of documents.
 * @param onError - Optional callback to handle errors.
 * @param where - Optional array for where clauses.
 * @param orderBy - Optional array for ordering clauses.
 * @param limit - Optional limit for pagination.
 * @returns An unsubscribe function.
 */
export const onSnapshotCollection = <T>(
    collectionPath: string, 
    onResult: (data: T[]) => void, 
    onError?: (error: Error) => void,
    where?: WhereOptions[],
    orderBy?: OrderByOptions,
    limit?: number
) => {
    let query: Query = firestore().collection(collectionPath);

    if (where) {
        where.forEach(([field, op, value]) => {
            query = query.where(field, op, value);
        });
    }

    if (orderBy) {
        query = query.orderBy(...orderBy);
    }
    
    if (limit) {
        query = query.limit(limit);
    }

    return query.onSnapshot(
        (querySnapshot) => {
            const data: T[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
            onResult(data);
        },
        onError
    );
};
