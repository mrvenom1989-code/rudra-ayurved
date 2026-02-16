import PatientProfileClient from "./PatientProfileClient";

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const appointmentId = resolvedSearchParams?.appointmentId as string | undefined;

  return (
    <PatientProfileClient
      patientId={id}
      linkedAppointmentId={appointmentId || null}
    />
  );
}