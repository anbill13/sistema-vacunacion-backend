USE VacunacionDB;
GO

-- 1. Procedimientos para Niños
CREATE PROCEDURE sp_CrearNino
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @nacionalidad NVARCHAR(50),
    @pais_nacimiento NVARCHAR(100) = NULL,
    @fecha_nacimiento DATE,
    @genero CHAR(1),
    @direccion_residencia NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @id_centro_salud UNIQUEIDENTIFIER = NULL,
    @contacto_principal NVARCHAR(50) = NULL,
    @id_salud_nacional NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        -- Validar edad máxima (14 años) basada en la fecha actual (06:09 PM AST, 19 de junio de 2025)
        IF DATEDIFF(YEAR, @fecha_nacimiento, GETDATE()) > 14
            THROW 50001, 'El niño debe tener como máximo 14 años.', 1;

        INSERT INTO Niños (nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento, genero, 
                          direccion_residencia, latitud, longitud, id_centro_salud, contacto_principal, id_salud_nacional, estado)
        VALUES (@nombre_completo, @identificacion, @nacionalidad, @pais_nacimiento, @fecha_nacimiento, @genero, 
                @direccion_residencia, @latitud, @longitud, @id_centro_salud, @contacto_principal, @id_salud_nacional, 'Activo');
        
        SELECT id_niño FROM Niños WHERE id_niño = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerNino
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_niño, nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento, genero, 
           direccion_residencia, latitud, longitud, id_centro_salud, contacto_principal, id_salud_nacional, estado
    FROM Niños
    WHERE id_niño = @id_niño AND estado = 'Activo';
END;
GO

CREATE PROCEDURE sp_ActualizarNino
    @id_niño UNIQUEIDENTIFIER,
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @nacionalidad NVARCHAR(50),
    @pais_nacimiento NVARCHAR(100) = NULL,
    @fecha_nacimiento DATE,
    @genero CHAR(1),
    @direccion_residencia NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @id_centro_salud UNIQUEIDENTIFIER = NULL,
    @contacto_principal NVARCHAR(50) = NULL,
    @id_salud_nacional NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50001, 'Niño no encontrado o inactivo.', 1;

        -- Validar edad máxima (14 años) basada en la fecha actual
        IF DATEDIFF(YEAR, @fecha_nacimiento, GETDATE()) > 14
            THROW 50002, 'El niño debe tener como máximo 14 años.', 1;

        UPDATE Niños
        SET nombre_completo = @nombre_completo,
            identificacion = @identificacion,
            nacionalidad = @nacionalidad,
            pais_nacimiento = @pais_nacimiento,
            fecha_nacimiento = @fecha_nacimiento,
            genero = @genero,
            direccion_residencia = @direccion_residencia,
            latitud = @latitud,
            longitud = @longitud,
            id_centro_salud = @id_centro_salud,
            contacto_principal = @contacto_principal,
            id_salud_nacional = @id_salud_nacional
        WHERE id_niño = @id_niño;

        IF @@ROWCOUNT = 0
            THROW 50003, 'Error al actualizar el niño.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarNino
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Niños
        SET estado = 'Inactivo'
        WHERE id_niño = @id_niño;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Niño no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 2. Procedimientos para Tutores
CREATE PROCEDURE sp_CrearTutor
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @relacion NVARCHAR(50),
    @nacionalidad NVARCHAR(50),
    @identificacion NVARCHAR(20) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50001, 'Niño no encontrado o inactivo.', 1;

        -- Verificar que haya al menos 2 tutores principales (padre y madre) o permitir tutor adicional
        DECLARE @tutorCount INT;
        SELECT @tutorCount = COUNT(*) 
        FROM Tutores 
        WHERE id_niño = @id_niño AND estado = 'Activo' AND relacion IN ('Padre', 'Madre');
        
        IF @tutorCount >= 2 AND @relacion NOT IN ('Padre', 'Madre')
            THROW 50002, 'Ya existen 2 tutores principales. Solo se permite un tutor adicional.', 1;

        INSERT INTO Tutores (id_niño, nombre, relacion, nacionalidad, identificacion, telefono, email, direccion, estado)
        VALUES (@id_niño, @nombre, @relacion, @nacionalidad, @identificacion, @telefono, @email, @direccion, 'Activo');
        
        SELECT id_tutor FROM Tutores WHERE id_tutor = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerTutor
    @id_tutor UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_tutor, id_niño, nombre, relacion, nacionalidad, identificacion, telefono, email, direccion, estado
    FROM Tutores
    WHERE id_tutor = @id_tutor AND estado = 'Activo';
END;
GO

CREATE PROCEDURE sp_ActualizarTutor
    @id_tutor UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @relacion NVARCHAR(50),
    @nacionalidad NVARCHAR(50),
    @identificacion NVARCHAR(20) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Tutores WHERE id_tutor = @id_tutor AND estado = 'Activo')
            THROW 50001, 'Tutor no encontrado o inactivo.', 1;

        UPDATE Tutores
        SET id_niño = @id_niño,
            nombre = @nombre,
            relacion = @relacion,
            nacionalidad = @nacionalidad,
            identificacion = @identificacion,
            telefono = @telefono,
            email = @email,
            direccion = @direccion
        WHERE id_tutor = @id_tutor;

        IF @@ROWCOUNT = 0
            THROW 50002, 'Error al actualizar el tutor.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarTutor
    @id_tutor UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Tutores
        SET estado = 'Inactivo'
        WHERE id_tutor = @id_tutor;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Tutor no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 3. Procedimientos para Centros_Vacunacion
CREATE PROCEDURE sp_CrearCentroVacunacion
    @nombre_centro NVARCHAR(200),
    @nombre_corto NVARCHAR(50) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @director NVARCHAR(200) = NULL,
    @sitio_web NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Centros_Vacunacion (nombre_centro, nombre_corto, direccion, latitud, longitud, telefono, director, sitio_web, estado)
        VALUES (@nombre_centro, @nombre_corto, @direccion, @latitud, @longitud, @telefono, @director, @sitio_web, 'Activo');
        
        SELECT id_centro FROM Centros_Vacunacion WHERE id_centro = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerCentroVacunacion
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_centro, nombre_centro, nombre_corto, direccion, latitud, longitud, telefono, director, sitio_web, estado
    FROM Centros_Vacunacion
    WHERE id_centro = @id_centro AND estado = 'Activo';
END;
GO

CREATE PROCEDURE sp_ActualizarCentroVacunacion
    @id_centro UNIQUEIDENTIFIER,
    @nombre_centro NVARCHAR(200),
    @nombre_corto NVARCHAR(50) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @director NVARCHAR(200) = NULL,
    @sitio_web NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50001, 'Centro de vacunación no encontrado o inactivo.', 1;

        UPDATE Centros_Vacunacion
        SET nombre_centro = @nombre_centro,
            nombre_corto = @nombre_corto,
            direccion = @direccion,
            latitud = @latitud,
            longitud = @longitud,
            telefono = @telefono,
            director = @director,
            sitio_web = @sitio_web
        WHERE id_centro = @id_centro;

        IF @@ROWCOUNT = 0
            THROW 50002, 'Error al actualizar el centro de vacunación.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarCentroVacunacion
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Centros_Vacunacion
        SET estado = 'Inactivo'
        WHERE id_centro = @id_centro;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Centro de vacunación no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 4. Procedimientos para Vacunas
CREATE PROCEDURE sp_CrearVacuna
    @nombre NVARCHAR(100),
    @fabricante NVARCHAR(100),
    @tipo NVARCHAR(50),
    @dosis_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Vacunas (nombre, fabricante, tipo, dosis_requeridas)
        VALUES (@nombre, @fabricante, @tipo, @dosis_requeridas);
        
        SELECT id_vacuna FROM Vacunas WHERE id_vacuna = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerVacuna
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_vacuna, nombre, fabricante, tipo, dosis_requeridas
    FROM Vacunas
    WHERE id_vacuna = @id_vacuna;
END;
GO

CREATE PROCEDURE sp_ActualizarVacuna
    @id_vacuna UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @fabricante NVARCHAR(100),
    @tipo NVARCHAR(50),
    @dosis_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna)
            THROW 50001, 'Vacuna no encontrada.', 1;

        UPDATE Vacunas
        SET nombre = @nombre,
            fabricante = @fabricante,
            tipo = @tipo,
            dosis_requeridas = @dosis_requeridas
        WHERE id_vacuna = @id_vacuna;

        IF @@ROWCOUNT = 0
            THROW 50002, 'Error al actualizar la vacuna.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarVacuna
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Vacunas
        WHERE id_vacuna = @id_vacuna;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Vacuna no encontrada.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 5. Procedimientos para Esquema_Vacunacion
CREATE PROCEDURE sp_CrearEsquemaVacunacion
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna)
            THROW 50001, 'Vacuna no encontrada.', 1;

        INSERT INTO Esquema_Vacunacion (id_vacuna, orden_dosis, edad_recomendada, descripcion)
        VALUES (@id_vacuna, @orden_dosis, @edad_recomendada, @descripcion);
        
        SELECT id_esquema FROM Esquema_Vacunacion WHERE id_esquema = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_esquema, id_vacuna, orden_dosis, edad_recomendada, descripcion
    FROM Esquema_Vacunacion
    WHERE id_esquema = @id_esquema;
END;
GO

CREATE PROCEDURE sp_ActualizarEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema)
            THROW 50001, 'Esquema de vacunación no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna)
            THROW 50002, 'Vacuna no encontrada.', 1;

        UPDATE Esquema_Vacunacion
        SET id_vacuna = @id_vacuna,
            orden_dosis = @orden_dosis,
            edad_recomendada = @edad_recomendada,
            descripcion = @descripcion
        WHERE id_esquema = @id_esquema;

        IF @@ROWCOUNT = 0
            THROW 50003, 'Error al actualizar el esquema de vacunación.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Esquema_Vacunacion
        WHERE id_esquema = @id_esquema;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Esquema de vacunación no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 6. Procedimientos para Calendarios_Nacionales
CREATE PROCEDURE sp_CrearCalendarioNacional
    @nombre_pais NVARCHAR(100),
    @descripcion NVARCHAR(500) = NULL,
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE nombre = @nombre_pais)
            THROW 50001, 'País no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema)
            THROW 50002, 'Esquema de vacunación no encontrado.', 1;

        INSERT INTO Calendarios_Nacionales (nombre_pais, descripcion, id_esquema)
        VALUES (@nombre_pais, @descripcion, @id_esquema);
        
        SELECT id_calendario FROM Calendarios_Nacionales WHERE id_calendario = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerCalendarioNacional
    @id_calendario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_calendario, nombre_pais, descripcion, id_esquema
    FROM Calendarios_Nacionales
    WHERE id_calendario = @id_calendario;
END;
GO

CREATE PROCEDURE sp_ActualizarCalendarioNacional
    @id_calendario UNIQUEIDENTIFIER,
    @nombre_pais NVARCHAR(100),
    @descripcion NVARCHAR(500) = NULL,
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Calendarios_Nacionales WHERE id_calendario = @id_calendario)
            THROW 50001, 'Calendario nacional no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE nombre = @nombre_pais)
            THROW 50002, 'País no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema)
            THROW 50003, 'Esquema de vacunación no encontrado.', 1;

        UPDATE Calendarios_Nacionales
        SET nombre_pais = @nombre_pais,
            descripcion = @descripcion,
            id_esquema = @id_esquema
        WHERE id_calendario = @id_calendario;

        IF @@ROWCOUNT = 0
            THROW 50004, 'Error al actualizar el calendario nacional.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarCalendarioNacional
    @id_calendario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Calendarios_Nacionales
        WHERE id_calendario = @id_calendario;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Calendario nacional no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 7. Procedimientos para Lotes_Vacunas
CREATE PROCEDURE sp_CrearLoteVacuna
    @id_vacuna UNIQUEIDENTIFIER,
    @numero_lote NVARCHAR(50),
    @cantidad_total INT,
    @cantidad_disponible INT,
    @fecha_fabricacion DATE,
    @fecha_vencimiento DATE,
    @id_centro UNIQUEIDENTIFIER,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna)
            THROW 50001, 'Vacuna no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50002, 'Centro de vacunación no encontrado o inactivo.', 1;
        IF @cantidad_disponible > @cantidad_total
            THROW 50003, 'La cantidad disponible no puede exceder la cantidad total.', 1;

        INSERT INTO Lotes_Vacunas (id_vacuna, numero_lote, cantidad_total, cantidad_disponible, fecha_fabricacion, fecha_vencimiento, id_centro, condiciones_almacenamiento)
        VALUES (@id_vacuna, @numero_lote, @cantidad_total, @cantidad_disponible, @fecha_fabricacion, @fecha_vencimiento, @id_centro, @condiciones_almacenamiento);
        
        SELECT id_lote FROM Lotes_Vacunas WHERE id_lote = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerLoteVacuna
    @id_lote UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_lote, id_vacuna, numero_lote, cantidad_total, cantidad_disponible, fecha_fabricacion, fecha_vencimiento, id_centro, condiciones_almacenamiento
    FROM Lotes_Vacunas
    WHERE id_lote = @id_lote;
END;
GO

CREATE PROCEDURE sp_ActualizarLoteVacuna
    @id_lote UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @numero_lote NVARCHAR(50),
    @cantidad_total INT,
    @cantidad_disponible INT,
    @fecha_fabricacion DATE,
    @fecha_vencimiento DATE,
    @id_centro UNIQUEIDENTIFIER,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Lotes_Vacunas WHERE id_lote = @id_lote)
            THROW 50001, 'Lote de vacuna no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna)
            THROW 50002, 'Vacuna no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50003, 'Centro de vacunación no encontrado o inactivo.', 1;
        IF @cantidad_disponible > @cantidad_total
            THROW 50004, 'La cantidad disponible no puede exceder la cantidad total.', 1;

        UPDATE Lotes_Vacunas
        SET id_vacuna = @id_vacuna,
            numero_lote = @numero_lote,
            cantidad_total = @cantidad_total,
            cantidad_disponible = @cantidad_disponible,
            fecha_fabricacion = @fecha_fabricacion,
            fecha_vencimiento = @fecha_vencimiento,
            id_centro = @id_centro,
            condiciones_almacenamiento = @condiciones_almacenamiento
        WHERE id_lote = @id_lote;

        IF @@ROWCOUNT = 0
            THROW 50005, 'Error al actualizar el lote de vacuna.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarLoteVacuna
    @id_lote UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Lotes_Vacunas
        WHERE id_lote = @id_lote;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Lote de vacuna no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 8. Procedimientos para Historial_Vacunacion
CREATE PROCEDURE sp_RegistrarVacunacion
    @id_niño UNIQUEIDENTIFIER,
    @id_lote UNIQUEIDENTIFIER,
    @id_personal UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER = NULL,
    @fecha_vacunacion DATETIME2,
    @dosis_aplicada INT,
    @sitio_aplicacion NVARCHAR(100) = NULL,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        -- Verificar que el niño existe y está activo
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50001, 'Niño no encontrado o inactivo.', 1;

        -- Verificar disponibilidad del lote
        IF NOT EXISTS (SELECT 1 FROM Lotes_Vacunas WHERE id_lote = @id_lote AND cantidad_disponible > 0)
            THROW 50002, 'Lote no disponible.', 1;
        IF NOT EXISTS (SELECT 1 FROM Personal_Salud WHERE id_personal = @id_personal)
            THROW 50003, 'Personal de salud no encontrado.', 1;

        INSERT INTO Historial_Vacunacion (id_niño, id_lote, id_personal, id_centro, fecha_vacunacion, dosis_aplicada, sitio_aplicacion, observaciones)
        VALUES (@id_niño, @id_lote, @id_personal, @id_centro, @fecha_vacunacion, @dosis_aplicada, @sitio_aplicacion, @observaciones);

        -- Reducir la cantidad disponible del lote
        UPDATE Lotes_Vacunas
        SET cantidad_disponible = cantidad_disponible - 1
        WHERE id_lote = @id_lote;

        SELECT id_historial FROM Historial_Vacunacion WHERE id_historial = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerHistorialVacunacion
    @id_historial UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT h.id_historial, h.id_niño, h.id_lote, h.id_personal, h.id_centro, h.fecha_vacunacion, h.dosis_aplicada, 
           h.sitio_aplicacion, h.observaciones,
           v.nombre AS nombre_vacuna, v.fabricante, v.tipo
    FROM Historial_Vacunacion h
    JOIN Lotes_Vacunas l ON h.id_lote = l.id_lote
    JOIN Vacunas v ON l.id_vacuna = v.id_vacuna
    WHERE h.id_historial = @id_historial;
END;
GO

CREATE PROCEDURE sp_ActualizarHistorialVacunacion
    @id_historial UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_lote UNIQUEIDENTIFIER,
    @id_personal UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER = NULL,
    @fecha_vacunacion DATETIME2,
    @dosis_aplicada INT,
    @sitio_aplicacion NVARCHAR(100) = NULL,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Historial_Vacunacion WHERE id_historial = @id_historial)
            THROW 50001, 'Historial de vacunación no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50002, 'Niño no encontrado o inactivo.', 1;
        IF NOT EXISTS (SELECT 1 FROM Lotes_Vacunas WHERE id_lote = @id_lote)
            THROW 50003, 'Lote de vacuna no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Personal_Salud WHERE id_personal = @id_personal)
            THROW 50004, 'Personal de salud no encontrado.', 1;

        UPDATE Historial_Vacunacion
        SET id_niño = @id_niño,
            id_lote = @id_lote,
            id_personal = @id_personal,
            id_centro = @id_centro,
            fecha_vacunacion = @fecha_vacunacion,
            dosis_aplicada = @dosis_aplicada,
            sitio_aplicacion = @sitio_aplicacion,
            observaciones = @observaciones
        WHERE id_historial = @id_historial;

        IF @@ROWCOUNT = 0
            THROW 50005, 'Error al actualizar el historial de vacunación.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarHistorialVacunacion
    @id_historial UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Historial_Vacunacion
        WHERE id_historial = @id_historial;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Historial de vacunación no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 9. Procedimientos para Inventario_Suministros
CREATE PROCEDURE sp_CrearInventarioSuministro
    @nombre_suministro NVARCHAR(100),
    @tipo_suministro NVARCHAR(50) = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_entrada DATE,
    @fecha_vencimiento DATE = NULL,
    @proveedor NVARCHAR(200) = NULL,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50001, 'Centro de vacunación no encontrado o inactivo.', 1;
        IF @cantidad_disponible > @cantidad_total
            THROW 50002, 'La cantidad disponible no puede exceder la cantidad total.', 1;

        INSERT INTO Inventario_Suministros (nombre_suministro, tipo_suministro, cantidad_total, cantidad_disponible, id_centro, fecha_entrada, fecha_vencimiento, proveedor, condiciones_almacenamiento)
        VALUES (@nombre_suministro, @tipo_suministro, @cantidad_total, @cantidad_disponible, @id_centro, @fecha_entrada, @fecha_vencimiento, @proveedor, @condiciones_almacenamiento);
        
        SELECT id_suministro FROM Inventario_Suministros WHERE id_suministro = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerInventarioSuministro
    @id_suministro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_suministro, nombre_suministro, tipo_suministro, cantidad_total, cantidad_disponible, id_centro, fecha_entrada, fecha_vencimiento, proveedor, condiciones_almacenamiento
    FROM Inventario_Suministros
    WHERE id_suministro = @id_suministro;
END;
GO

CREATE PROCEDURE sp_ActualizarInventarioSuministro
    @id_suministro UNIQUEIDENTIFIER,
    @nombre_suministro NVARCHAR(100),
    @tipo_suministro NVARCHAR(50) = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_entrada DATE,
    @fecha_vencimiento DATE = NULL,
    @proveedor NVARCHAR(200) = NULL,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Inventario_Suministros WHERE id_suministro = @id_suministro)
            THROW 50001, 'Suministro no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50002, 'Centro de vacunación no encontrado o inactivo.', 1;
        IF @cantidad_disponible > @cantidad_total
            THROW 50003, 'La cantidad disponible no puede exceder la cantidad total.', 1;

        UPDATE Inventario_Suministros
        SET nombre_suministro = @nombre_suministro,
            tipo_suministro = @tipo_suministro,
            cantidad_total = @cantidad_total,
            cantidad_disponible = @cantidad_disponible,
            id_centro = @id_centro,
            fecha_entrada = @fecha_entrada,
            fecha_vencimiento = @fecha_vencimiento,
            proveedor = @proveedor,
            condiciones_almacenamiento = @condiciones_almacenamiento
        WHERE id_suministro = @id_suministro;

        IF @@ROWCOUNT = 0
            THROW 50004, 'Error al actualizar el suministro.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarInventarioSuministro
    @id_suministro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Inventario_Suministros
        WHERE id_suministro = @id_suministro;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Suministro no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 10. Procedimientos para Campanas_Vacunacion
CREATE PROCEDURE sp_CrearCampanaVacunacion
    @nombre_campaña NVARCHAR(200),
    @fecha_inicio DATE,
    @fecha_fin DATE = NULL,
    @objetivo NVARCHAR(500) = NULL,
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna)
            THROW 50001, 'Vacuna no encontrada.', 1;

        INSERT INTO Campanas_Vacunacion (nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado)
        VALUES (@nombre_campaña, @fecha_inicio, @fecha_fin, @objetivo, @id_vacuna, 'Planificada');
        
        SELECT id_campaña FROM Campanas_Vacunacion WHERE id_campaña = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_campaña, nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado
    FROM Campanas_Vacunacion
    WHERE id_campaña = @id_campaña;
END;
GO

CREATE PROCEDURE sp_ActualizarCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER,
    @nombre_campaña NVARCHAR(200),
    @fecha_inicio DATE,
    @fecha_fin DATE = NULL,
    @objetivo NVARCHAR(500) = NULL,
    @id_vacuna UNIQUEIDENTIFIER,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña)
            THROW 50001, 'Campaña de vacunación no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna)
            THROW 50002, 'Vacuna no encontrada.', 1;
        IF @estado NOT IN ('Planificada', 'En Curso', 'Finalizada')
            THROW 50003, 'Estado inválido para la campaña.', 1;

        UPDATE Campanas_Vacunacion
        SET nombre_campaña = @nombre_campaña,
            fecha_inicio = @fecha_inicio,
            fecha_fin = @fecha_fin,
            objetivo = @objetivo,
            id_vacuna = @id_vacuna,
            estado = @estado
        WHERE id_campaña = @id_campaña;

        IF @@ROWCOUNT = 0
            THROW 50004, 'Error al actualizar la campaña de vacunación.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Campanas_Vacunacion
        WHERE id_campaña = @id_campaña;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Campaña de vacunación no encontrada.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 11. Procedimientos para Campana_Centro
CREATE PROCEDURE sp_AsignarCampanaCentro
    @id_campaña UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_asignacion DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña)
            THROW 50001, 'Campaña de vacunación no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50002, 'Centro de vacunación no encontrado o inactivo.', 1;

        INSERT INTO Campana_Centro (id_campaña, id_centro, fecha_asignacion)
        VALUES (@id_campaña, @id_centro, @fecha_asignacion);
        
        SELECT id_campaña_centro FROM Campana_Centro WHERE id_campaña_centro = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_campaña_centro, id_campaña, id_centro, fecha_asignacion
    FROM Campana_Centro
    WHERE id_campaña_centro = @id_campaña_centro;
END;
GO

CREATE PROCEDURE sp_ActualizarCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER,
    @id_campaña UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_asignacion DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro)
            THROW 50001, 'Asignación de campaña no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña)
            THROW 50002, 'Campaña de vacunación no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50003, 'Centro de vacunación no encontrado o inactivo.', 1;

        UPDATE Campana_Centro
        SET id_campaña = @id_campaña,
            id_centro = @id_centro,
            fecha_asignacion = @fecha_asignacion
        WHERE id_campaña_centro = @id_campaña_centro;

        IF @@ROWCOUNT = 0
            THROW 50004, 'Error al actualizar la asignación de campaña.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Campana_Centro
        WHERE id_campaña_centro = @id_campaña_centro;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Asignación de campaña no encontrada.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 12. Procedimientos para Personal_Salud
CREATE PROCEDURE sp_CrearPersonalSalud
    @nombre NVARCHAR(200),
    @cedula NVARCHAR(20),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @id_centro UNIQUEIDENTIFIER,
    @especialidad NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50001, 'Centro de vacunación no encontrado o inactivo.', 1;

        INSERT INTO Personal_Salud (nombre, cedula, telefono, email, id_centro, especialidad)
        VALUES (@nombre, @cedula, @telefono, @email, @id_centro, @especialidad);
        
        SELECT id_personal FROM Personal_Salud WHERE id_personal = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerPersonalSalud
    @id_personal UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_personal, nombre, cedula, telefono, email, id_centro, especialidad
    FROM Personal_Salud
    WHERE id_personal = @id_personal;
END;
GO

CREATE PROCEDURE sp_ActualizarPersonalSalud
    @id_personal UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @cedula NVARCHAR(20),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @id_centro UNIQUEIDENTIFIER,
    @especialidad NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Personal_Salud WHERE id_personal = @id_personal)
            THROW 50001, 'Personal de salud no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50002, 'Centro de vacunación no encontrado o inactivo.', 1;

        UPDATE Personal_Salud
        SET nombre = @nombre,
            cedula = @cedula,
            telefono = @telefono,
            email = @email,
            id_centro = @id_centro,
            especialidad = @especialidad
        WHERE id_personal = @id_personal;

        IF @@ROWCOUNT = 0
            THROW 50003, 'Error al actualizar el personal de salud.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarPersonalSalud
    @id_personal UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Personal_Salud
        WHERE id_personal = @id_personal;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Personal de salud no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 13. Procedimientos para Usuarios
CREATE PROCEDURE sp_CrearUsuario
    @nombre NVARCHAR(200),
    @rol NVARCHAR(50),
    @id_centro UNIQUEIDENTIFIER = NULL,
    @username NVARCHAR(50),
    @password_hash NVARCHAR(500),
    @email NVARCHAR(100) = NULL,
    @telefono NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_centro IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50001, 'Centro de vacunación no encontrado o inactivo.', 1;

        INSERT INTO Usuarios (nombre, rol, id_centro, username, password_hash, email, telefono, estado)
        VALUES (@nombre, @rol, @id_centro, @username, @password_hash, @email, @telefono, 'Activo');
        
        SELECT id_usuario FROM Usuarios WHERE id_usuario = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerUsuario
    @id_usuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_usuario, nombre, rol, id_centro, username, password_hash, email, telefono, estado
    FROM Usuarios
    WHERE id_usuario = @id_usuario AND estado = 'Activo';
END;
GO

CREATE PROCEDURE sp_ActualizarUsuario
    @id_usuario UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @rol NVARCHAR(50),
    @id_centro UNIQUEIDENTIFIER = NULL,
    @username NVARCHAR(50),
    @password_hash NVARCHAR(500),
    @email NVARCHAR(100) = NULL,
    @telefono NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE id_usuario = @id_usuario AND estado = 'Activo')
            THROW 50001, 'Usuario no encontrado o inactivo.', 1;
        IF @id_centro IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50002, 'Centro de vacunación no encontrado o inactivo.', 1;

        UPDATE Usuarios
        SET nombre = @nombre,
            rol = @rol,
            id_centro = @id_centro,
            username = @username,
            password_hash = @password_hash,
            email = @email,
            telefono = @telefono
        WHERE id_usuario = @id_usuario;

        IF @@ROWCOUNT = 0
            THROW 50003, 'Error al actualizar el usuario.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarUsuario
    @id_usuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Usuarios
        SET estado = 'Inactivo'
        WHERE id_usuario = @id_usuario;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Usuario no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 14. Procedimientos para Auditoria
CREATE PROCEDURE sp_RegistrarAuditoria
    @tabla_afectada NVARCHAR(100),
    @id_registro UNIQUEIDENTIFIER,
    @id_usuario UNIQUEIDENTIFIER,
    @accion NVARCHAR(20),
    @detalles NVARCHAR(500) = NULL,
    @ip_origen NVARCHAR(15) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE id_usuario = @id_usuario AND estado = 'Activo')
            THROW 50001, 'Usuario no encontrado o inactivo.', 1;
        IF @accion NOT IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')
            THROW 50002, 'Acción inválida.', 1;

        INSERT INTO Auditoria (tabla_afectada, id_registro, id_usuario, accion, detalles, ip_origen, fecha_registro)
        VALUES (@tabla_afectada, @id_registro, @id_usuario, @accion, @detalles, @ip_origen, GETDATE());
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerAuditoria
    @id_auditoria UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_auditoria, tabla_afectada, id_registro, id_usuario, accion, detalles, ip_origen, fecha_registro
    FROM Auditoria
    WHERE id_auditoria = @id_auditoria;
END;
GO

-- 15. Procedimientos para Eventos_Adversos
CREATE PROCEDURE sp_CrearEventoAdverso
    @id_niño UNIQUEIDENTIFIER,
    @id_historial UNIQUEIDENTIFIER,
    @descripcion_evento NVARCHAR(500),
    @fecha_evento DATE,
    @gravedad NVARCHAR(20),
    @id_personal_reportante UNIQUEIDENTIFIER,
    @acciones_tomadas NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50001, 'Niño no encontrado o inactivo.', 1;
        IF NOT EXISTS (SELECT 1 FROM Historial_Vacunacion WHERE id_historial = @id_historial)
            THROW 50002, 'Historial de vacunación no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Personal_Salud WHERE id_personal = @id_personal_reportante)
            THROW 50003, 'Personal reportante no encontrado.', 1;
        IF @gravedad NOT IN ('Leve', 'Moderado', 'Grave')
            THROW 50004, 'Gravedad inválida.', 1;

        INSERT INTO Eventos_Adversos (id_niño, id_historial, descripcion_evento, fecha_evento, gravedad, id_personal_reportante, acciones_tomadas, estado)
        VALUES (@id_niño, @id_historial, @descripcion_evento, @fecha_evento, @gravedad, @id_personal_reportante, @acciones_tomadas, 'Reportado');
        
        SELECT id_evento FROM Eventos_Adversos WHERE id_evento = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerEventoAdverso
    @id_evento UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_evento, id_niño, id_historial, descripcion_evento, fecha_evento, gravedad, id_personal_reportante, acciones_tomadas, estado
    FROM Eventos_Adversos
    WHERE id_evento = @id_evento;
END;
GO

CREATE PROCEDURE sp_ActualizarEventoAdverso
    @id_evento UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_historial UNIQUEIDENTIFIER,
    @descripcion_evento NVARCHAR(500),
    @fecha_evento DATE,
    @gravedad NVARCHAR(20),
    @id_personal_reportante UNIQUEIDENTIFIER,
    @acciones_tomadas NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Eventos_Adversos WHERE id_evento = @id_evento)
            THROW 50001, 'Evento adverso no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50002, 'Niño no encontrado o inactivo.', 1;
        IF NOT EXISTS (SELECT 1 FROM Historial_Vacunacion WHERE id_historial = @id_historial)
            THROW 50003, 'Historial de vacunación no encontrado.', 1;
        IF NOT EXISTS (SELECT 1 FROM Personal_Salud WHERE id_personal = @id_personal_reportante)
            THROW 50004, 'Personal reportante no encontrado.', 1;
        IF @gravedad NOT IN ('Leve', 'Moderado', 'Grave')
            THROW 50005, 'Gravedad inválida.', 1;
        IF @estado NOT IN ('Reportado', 'En Investigación', 'Resuelto')
            THROW 50006, 'Estado inválido.', 1;

        UPDATE Eventos_Adversos
        SET id_niño = @id_niño,
            id_historial = @id_historial,
            descripcion_evento = @descripcion_evento,
            fecha_evento = @fecha_evento,
            gravedad = @gravedad,
            id_personal_reportante = @id_personal_reportante,
            acciones_tomadas = @acciones_tomadas,
            estado = @estado
        WHERE id_evento = @id_evento;

        IF @@ROWCOUNT = 0
            THROW 50007, 'Error al actualizar el evento adverso.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarEventoAdverso
    @id_evento UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Eventos_Adversos
        WHERE id_evento = @id_evento;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Evento adverso no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 16. Procedimientos para Alertas
CREATE PROCEDURE sp_CrearAlerta
    @id_niño UNIQUEIDENTIFIER,
    @tipo_alerta NVARCHAR(100),
    @fecha_alerta DATETIME2,
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50001, 'Niño no encontrado o inactivo.', 1;

        INSERT INTO Alertas (id_niño, tipo_alerta, fecha_alerta, descripcion, estado)
        VALUES (@id_niño, @tipo_alerta, @fecha_alerta, @descripcion, 'Pendiente');
        
        SELECT id_alerta FROM Alertas WHERE id_alerta = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerAlerta
    @id_alerta UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_alerta, id_niño, tipo_alerta, fecha_alerta, descripcion, estado
    FROM Alertas
    WHERE id_alerta = @id_alerta AND estado IN ('Pendiente', 'Resuelta');
END;
GO

CREATE PROCEDURE sp_ActualizarAlerta
    @id_alerta UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @tipo_alerta NVARCHAR(100),
    @fecha_alerta DATETIME2,
    @descripcion NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Alertas WHERE id_alerta = @id_alerta)
            THROW 50001, 'Alerta no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50002, 'Niño no encontrado o inactivo.', 1;
        IF @estado NOT IN ('Pendiente', 'Resuelta')
            THROW 50003, 'Estado inválido.', 1;

        UPDATE Alertas
        SET id_niño = @id_niño,
            tipo_alerta = @tipo_alerta,
            fecha_alerta = @fecha_alerta,
            descripcion = @descripcion,
            estado = @estado
        WHERE id_alerta = @id_alerta;

        IF @@ROWCOUNT = 0
            THROW 50004, 'Error al actualizar la alerta.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarAlerta
    @id_alerta UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Alertas
        WHERE id_alerta = @id_alerta;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Alerta no encontrada.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 17. Procedimientos para Citas
CREATE PROCEDURE sp_CrearCita
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20) = 'Pendiente'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50001, 'Niño no encontrado o inactivo.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50002, 'Centro de vacunación no encontrado o inactivo.', 1;
        IF @estado NOT IN ('Pendiente', 'Confirmada', 'Cancelada', 'Completada')
            THROW 50003, 'Estado inválido.', 1;

        INSERT INTO Citas (id_niño, id_centro, fecha_cita, estado)
        VALUES (@id_niño, @id_centro, @fecha_cita, @estado);
        
        SELECT id_cita FROM Citas WHERE id_cita = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerCita
    @id_cita UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_cita, id_niño, id_centro, fecha_cita, estado
    FROM Citas
    WHERE id_cita = @id_cita;
END;
GO

CREATE PROCEDURE sp_ActualizarCita
    @id_cita UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Citas WHERE id_cita = @id_cita)
            THROW 50001, 'Cita no encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM Niños WHERE id_niño = @id_niño AND estado = 'Activo')
            THROW 50002, 'Niño no encontrado o inactivo.', 1;
        IF NOT EXISTS (SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro AND estado = 'Activo')
            THROW 50003, 'Centro de vacunación no encontrado o inactivo.', 1;
        IF @estado NOT IN ('Pendiente', 'Confirmada', 'Cancelada', 'Completada')
            THROW 50004, 'Estado inválido.', 1;

        UPDATE Citas
        SET id_niño = @id_niño,
            id_centro = @id_centro,
            fecha_cita = @fecha_cita,
            estado = @estado
        WHERE id_cita = @id_cita;

        IF @@ROWCOUNT = 0
            THROW 50005, 'Error al actualizar la cita.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarCita
    @id_cita UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Citas
        WHERE id_cita = @id_cita;

        IF @@ROWCOUNT = 0
            THROW 50001, 'Cita no encontrada.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 18. Procedimientos para Paises
CREATE PROCEDURE sp_CrearPais
    @nombre NVARCHAR(100),
    @gentilicio NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Paises (nombre, gentilicio)
        VALUES (@nombre, @gentilicio);
        
        SELECT id_pais FROM Paises WHERE id_pais = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_ObtenerPais
    @id_pais UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_pais, nombre, gentilicio
    FROM Paises
    WHERE id_pais = @id_pais;
END;
GO

CREATE PROCEDURE sp_ActualizarPais
    @id_pais UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @gentilicio NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @id_pais)
            THROW 50001, 'País no encontrado.', 1;

        UPDATE Paises
        SET nombre = @nombre,
            gentilicio = @gentilicio
        WHERE id_pais = @id_pais;

        IF @@ROWCOUNT = 0
            THROW 50002, 'Error al actualizar el país.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE sp_EliminarPais
    @id_pais UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Paises
        WHERE id_pais = @id_pais;

        IF @@ROWCOUNT = 0
            THROW 50001, 'País no encontrado.', 1;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO