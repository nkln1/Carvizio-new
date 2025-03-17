import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiRequest from '../utils/apiRequest';

const ServicePublicProfile = () => {
  const { username } = useParams();
  console.log('Extracted username from URL:', username);

  const { data, error, isLoading } = useQuery(
    ['service-profile', username],
    () => apiRequest('GET', `/api/auth/service-profile/${username}`),
    { enabled: !!username }
  );

  console.log('API Response:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
  console.log('Is Loading:', isLoading);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Eroare la încărcarea profilului</p>;

  console.log('Extracted username from URL:', username);
  console.log('API Response:', data);
  console.log('Error:', error);
  console.log('Is Loading:', isLoading);

  if (!data) return <p>Nu există date pentru acest service.</p>;

  console.log("=== DEBUGGING FRONTEND ===");
  console.log("Extracted username from URL:", username);
  console.log("Is Loading:", isLoading);
  console.log("Error:", error);
  console.log("API Response:", data);

  if (error) {
    console.error("API Error:", error);
  }

  if (!data) {
    console.warn("⚠️ API response is undefined or null!");
  }
  
  return (
    <div>
      <h1>{data?.companyName ?? 'Numele service-ului nu este disponibil'}</h1>
      <p>Telefon: {data?.phone ?? 'N/A'}</p>
      <p>Adresa: {data?.address ?? 'N/A'}, {data?.city ?? 'N/A'}, {data?.county ?? 'N/A'}</p>
      <h2>Program de lucru</h2>
      <ul>
        {data?.workingHours?.length > 0 ? (
          data.workingHours.map((wh) => (
            <li key={wh.id}>
              Ziua: {wh.dayOfWeek} | {wh.isClosed ? 'Închis' : `Deschis: ${wh.openTime} - ${wh.closeTime}`}
            </li>
          ))
        ) : (
          <p>Programul de lucru nu este disponibil</p>
        )}
      </ul>
      <h2>Recenzii</h2>
      {data?.reviews?.length > 0 ? (
        <ul>
          {data.reviews.map((r, i) => (
            <li key={i}>{r.text}</li>
          ))}
        </ul>
      ) : (
        <p>Fără recenzii</p>
      )}
    </div>
  );
};

export default ServicePublicProfile;
