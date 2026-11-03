// La consulta debería ser algo así:
const { data, error } = await supabase
  .from('materias')
  .select(`
    id, 
    grupo, 
    plan_materias ( nombre ), 
    cursos ( 
      anio, 
      division, 
      ciclo, 
      modalidad,
      fp_perfiles ( nombre )
    )
  `)
  .eq('profesor_id', docente.id);