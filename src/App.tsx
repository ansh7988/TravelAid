import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import NearbyPage from './pages/NearbyPage';
import EmergencyPage from './pages/EmergencyPage';
import FamilyPage from './pages/FamilyPage';
import { TripsListPage, TripFormPage, TripDetailPage } from './pages/TripPages';
import { ProfilePage, SettingsPage, HelpPage, NotFoundPage } from './pages/OtherPages';
import { MessagingLayout, ChatsPage, GroupsPage, RequestsPage, ContactsPage } from './pages/MessagingPages';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="nearby" element={<NearbyPage />} />
        <Route path="emergency" element={<EmergencyPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="messages" element={<MessagingLayout />}>
          <Route index element={<ChatsPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
        </Route>
        <Route path="trips" element={<TripsListPage />} />
        <Route path="trips/new" element={<TripFormPage />} />
        <Route path="trips/:id" element={<TripDetailPage />} />
        <Route path="trips/:id/edit" element={<TripFormPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}