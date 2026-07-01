type TeamWithFieldOfficers<T extends { id: number }> = {
  id: number;
  fieldOfficers?: T[] | null;
};

export const getTeamIds = <T extends { id: number }>(teams: TeamWithFieldOfficers<T>[]): number[] => {
  return Array.from(new Set(teams.map((team) => team.id).filter((id) => Number.isFinite(id))));
};

export const getUniqueFieldOfficersFromTeams = <T extends { id: number }>(teams: TeamWithFieldOfficers<T>[]): T[] => {
  const byId = new Map<number, T>();

  teams.forEach((team) => {
    (team.fieldOfficers ?? []).forEach((officer) => {
      byId.set(officer.id, officer);
    });
  });

  return Array.from(byId.values());
};
