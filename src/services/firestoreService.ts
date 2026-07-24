import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from '@react-native-firebase/firestore';

type WhereFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
type WhereOptions = [string, WhereFilterOp, any];
type OrderByOptions = [string, 'asc' | 'desc'];

export const getDocument = async <T>(collectionPath: string, id: string): Promise<T | null> => {
  try {
    const db = getFirestore();
    const docSnapshot = await getDoc(doc(db, collectionPath, id));
    if (docSnapshot.data()) {
      return { id: docSnapshot.id, ...(docSnapshot.data() as any) } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document [${collectionPath}/${id}]:`, error);
    throw error;
  }
};

export const addDocument = async <T>(collectionPath: string, data: T): Promise<T & { id: string }> => {
  try {
    const db = getFirestore();
    const docRef = await addDoc(collection(db, collectionPath), data as any);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error adding document to [${collectionPath}]:`, error);
    throw error;
  }
};

export const updateDocument = async (collectionPath: string, id: string, data: Record<string, any>): Promise<void> => {
  try {
    const db = getFirestore();
    await updateDoc(doc(db, collectionPath, id), data);
  } catch (error) {
    console.error(`Error updating document [${collectionPath}/${id}]:`, error);
    throw error;
  }
};

export const deleteDocument = async (collectionPath: string, id: string): Promise<void> => {
  try {
    const db = getFirestore();
    await deleteDoc(doc(db, collectionPath, id));
  } catch (error) {
    console.error(`Error deleting document [${collectionPath}/${id}]:`, error);
    throw error;
  }
};

export const onSnapshotDocument = (collectionPath: string, id: string, onResult: (data: Record<string, any> | null) => void, onError?: (error: Error) => void) => {
  const db = getFirestore();
  return onSnapshot(
    doc(db, collectionPath, id),
    (docSnap) => {
      onResult(docSnap.data() ? { id: docSnap.id, ...(docSnap.data() as any) } : null);
    },
    onError
  );
};

export const onSnapshotCollection = <T>(
    collectionPath: string,
    onResult: (data: T[]) => void,
    onError?: (error: Error) => void,
    whereOpts?: WhereOptions[],
    orderByOpt?: OrderByOptions,
    limitOpt?: number
) => {
    const db = getFirestore();
    const constraints: any[] = [];

    if (whereOpts) {
        whereOpts.forEach(([field, op, value]) => {
            constraints.push(where(field, op, value));
        });
    }

    if (orderByOpt) {
        constraints.push(orderBy(orderByOpt[0], orderByOpt[1]));
    }

    if (limitOpt) {
        constraints.push(limit(limitOpt));
    }

    const q = query(collection(db, collectionPath), ...constraints);

    return onSnapshot(
        q,
        (querySnapshot) => {
            const data: T[] = querySnapshot.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as unknown as T));
            onResult(data);
        },
        onError
    );
};
