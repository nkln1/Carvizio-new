import { Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';

// Schema validare pentru înregistrarea token-ului
const registerTokenSchema = z.object({
  token: z.string().min(1),
  userId: z.number().int().positive(),
  userRole: z.enum(['client', 'service']),
});

/**
 * Înregistrează sau actualizează un token FCM pentru un utilizator
 */
export async function registerToken(req: Request, res: Response) {
  try {
    // Validăm datele
    const validatedData = registerTokenSchema.parse(req.body);
    const { token, userId, userRole } = validatedData;

    // Obținem referința la baza de date Firestore
    const db = admin.firestore();

    // Stocăm token-ul în colecția fcm_tokens
    await db.collection('fcm_tokens').doc(token).set({
      userId,
      userRole,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Adăugăm tokenul la profilul utilizatorului
    const userRef = db.collection(userRole === 'client' ? 'clients' : 'service_providers').doc(userId.toString());

    await userRef.set({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
      lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.status(200).json({ success: true, message: 'Token înregistrat cu succes' });
  } catch (error) {
    console.error('Eroare la înregistrarea token-ului:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date de intrare invalide', 
        errors: error.errors 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Eroare la înregistrarea token-ului'
    });
  }
}

/**
 * Șterge un token FCM pentru un utilizator
 */
export async function unregisterToken(req: Request, res: Response) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token-ul este obligatoriu' });
    }

    // Obținem referința la baza de date Firestore
    const db = admin.firestore();

    // Obținem documentul token-ului pentru a afla utilizatorul asociat
    const tokenDoc = await db.collection('fcm_tokens').doc(token).get();

    if (tokenDoc.exists) {
      const tokenData = tokenDoc.data();

      if (tokenData) {
        const { userId, userRole } = tokenData;

        // Ștergem token-ul din profilul utilizatorului
        const userRef = db.collection(userRole === 'client' ? 'clients' : 'service_providers').doc(userId.toString());

        await userRef.update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
          lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Ștergem documentul token-ului
    await db.collection('fcm_tokens').doc(token).delete();

    res.status(200).json({ success: true, message: 'Token șters cu succes' });
  } catch (error) {
    console.error('Eroare la ștergerea token-ului:', error);
    res.status(500).json({ success: false, message: 'Eroare la ștergerea token-ului' });
  }
}

/**
 * Trimite o notificare către unul sau mai mulți utilizatori
 */
export async function sendNotification(req: Request, res: Response) {
  try {
    const { userIds, userRole, title, body, data, topic } = req.body;

    if ((!userIds || !userIds.length) && !topic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trebuie să specificați cel puțin un ID de utilizator sau un topic' 
      });
    }

    if (!title || !body) {
      return res.status(400).json({ 
        success: false, 
        message: 'Titlul și conținutul notificării sunt obligatorii' 
      });
    }

    // Preparăm mesajul pentru notificare
    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
      webpush: {
        notification: {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        },
        fcmOptions: {
          link: data?.url || '/',
        },
      },
    };

    let response;

    // Trimitem către topic sau către utilizatori specifici
    if (topic) {
      response = await admin.messaging().send({
        ...messagePayload,
        topic,
      });
    } else {
      // Obținem token-urile utilizatorilor
      const db = admin.firestore();
      const collection = userRole === 'client' ? 'clients' : 'service_providers';

      const userTokens: string[] = [];

      // Pentru fiecare utilizator, obținem token-urile
      for (const userId of userIds) {
        const userDoc = await db.collection(collection).doc(userId.toString()).get();

        if (userDoc.exists) {
          const userData = userDoc.data();

          if (userData && userData.fcmTokens && userData.fcmTokens.length) {
            userTokens.push(...userData.fcmTokens);
          }
        }
      }

      if (userTokens.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Nu s-au găsit token-uri pentru utilizatorii specificați' 
        });
      }

      // Trimitem mesaj către toate token-urile găsite
      if (userTokens.length > 0) {
        // Pentru versiunile noi de Firebase Admin SDK folosim send pentru fiecare token
        // și consolidăm rezultatele
        const promises = userTokens.map(token => 
          admin.messaging().send({
            ...messagePayload,
            token
          })
        );

        const results = await Promise.all(promises);
        response = {
          successCount: results.length,
          failureCount: 0,
          responses: results.map((messageId, index) => ({
            success: true,
            messageId,
            originalIndex: index
          }))
        };
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Notificare trimisă cu succes', 
      response 
    });
  } catch (error) {
    console.error('Eroare la trimiterea notificării:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la trimiterea notificării',
      error: (error as Error).message
    });
  }
}