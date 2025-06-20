USE SistemaVacunacion;
GO

-- 1. Centros_Vacunacion
-- Create a new vaccination center
CREATE OR ALTER PROCEDURE sp_CrearCentroVacunacion
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
        DECLARE @id_centro UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Centros_Vacunacion (
            id_centro, nombre_centro, nombre_corto, direccion, latitud, longitud,
            telefono, director, sitio_web
        )
        VALUES (
            @id_centro, @nombre_centro, @nombre_corto, @direccion, @latitud, @longitud,
            @telefono, @director, @sitio_web
        );
        SELECT @id_centro AS id_centro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update a vaccination center
CREATE OR ALTER PROCEDURE sp_ActualizarCentroVacunacion
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
        UPDATE Centros_Vacunacion
        SET
            nombre_centro = @nombre_centro,
            nombre_corto = @nombre_corto,
            direccion = @direccion,
            latitud = @latitud,
            longitud = @longitud,
            telefono = @telefono,
            director = @director,
            sitio_web = @sitio_web
        WHERE id_centro = @id_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Centro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccination center
CREATE OR ALTER PROCEDURE sp_EliminarCentroVacunacion
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Niños WHERE id_centro_salud = @id_centro
            UNION
            SELECT 1 FROM Lotes_Vacunas WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Personal_Salud WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Usuarios WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Campana_Centro WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Citas WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Historial_Vacunacion WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Inventario_Suministros WHERE id_centro = @id_centro
        )
            RAISERROR ('No se puede eliminar el centro debido a registros dependientes', 16, 1);

        UPDATE Centros_Vacunacion 
        SET estado = 'Inactivo'
        WHERE id_centro = @id_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Centro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 2. Vacunas
-- Create a new vaccine
CREATE OR ALTER PROCEDURE sp_CrearVacuna
    @nombre NVARCHAR(100),
    @fabricante NVARCHAR(100),
    @tipo NVARCHAR(50),
    @dosis_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_vacuna UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Vacunas (
            id_vacuna, nombre, fabricante, tipo, dosis_requeridas
        )
        VALUES (
            @id_vacuna, @nombre, @fabricante, @tipo, @dosis_requeridas
        );
        SELECT @id_vacuna AS id_vacuna;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update a vaccine
CREATE OR ALTER PROCEDURE sp_ActualizarVacuna
    @id_vacuna UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @fabricante NVARCHAR(100),
    @tipo NVARCHAR(50),
    @dosis_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Vacunas
        SET
            nombre = @nombre,
            fabricante = @fabricante,
            tipo = @tipo,
            dosis_requeridas = @dosis_requeridas
        WHERE id_vacuna = @id_vacuna;
        IF @@ROWCOUNT = 0
            RAISERROR ('Vacuna no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccine
CREATE OR ALTER PROCEDURE sp_EliminarVacuna
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Lotes_Vacunas WHERE id_vacuna = @id_vacuna
            UNION
            SELECT 1 FROM Campanas_Vacunacion WHERE id_vacuna = @id_vacuna
            UNION
            SELECT 1 FROM Esquema_Vacunacion WHERE id_vacuna = @id_vacuna
        )
            RAISERROR ('No se puede eliminar la vacuna debido a registros dependientes', 16, 1);

        DELETE FROM Vacunas WHERE id_vacuna = @id_vacuna;
        IF @@ROWCOUNT = 0
            RAISERROR ('Vacuna no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 3. Niños
-- Create a new child
CREATE OR ALTER PROCEDURE sp_CrearNino
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @nacionalidad UNIQUEIDENTIFIER,
    @pais_nacimiento UNIQUEIDENTIFIER,
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
        -- Validate nacionalidad and pais_nacimiento exist in Paises
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @pais_nacimiento)
            RAISERROR ('País de nacimiento no válido', 16, 1);

        DECLARE @id_niño UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Niños (
            id_niño, nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento,
            genero, direccion_residencia, latitud, longitud, id_centro_salud,
            contacto_principal, id_salud_nacional
        )
        VALUES (
            @id_niño, @nombre_completo, @identificacion, @nacionalidad, @pais_nacimiento, @fecha_nacimiento,
            @genero, @direccion_residencia, @latitud, @longitud, @id_centro_salud,
            @contacto_principal, @id_salud_nacional
        );
        SELECT @id_niño AS id_niño;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update a child
CREATE OR ALTER PROCEDURE sp_ActualizarNino
    @id_niño UNIQUEIDENTIFIER,
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @nacionalidad UNIQUEIDENTIFIER,
    @pais_nacimiento UNIQUEIDENTIFIER,
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
        -- Validate nacionalidad and pais_nacimiento exist in Paises
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @pais_nacimiento)
            RAISERROR ('País de nacimiento no válido', 16, 1);

        UPDATE Niños
        SET
            nombre_completo = @nombre_completo,
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
            RAISERROR ('Niño no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 4. Tutores
-- Create a new guardian
CREATE OR ALTER PROCEDURE sp_CrearTutor
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @identificacion NVARCHAR(20) = NULL,
    @relacion NVARCHAR(50),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @nacionalidad UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        -- Validate nacionalidad exists in Paises
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);

        DECLARE @id_tutor UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Tutores (
            id_tutor, id_niño, nombre, identificacion, relacion, telefono, email, direccion, nacionalidad
        )
        VALUES (
            @id_tutor, @id_niño, @nombre, @identificacion, @relacion, @telefono, @email, @direccion, @nacionalidad
        );
        SELECT @id_tutor AS id_tutor;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update a guardian
CREATE OR ALTER PROCEDURE sp_ActualizarTutor
    @id_tutor UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @identificacion NVARCHAR(20) = NULL,
    @relacion NVARCHAR(50),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @nacionalidad UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        -- Validate nacionalidad exists in Paises
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);

        UPDATE Tutores
        SET
            id_niño = @id_niño,
            nombre = @nombre,
            identificacion = @identificacion,
            relacion = @relacion,
            telefono = @telefono,
            email = @email,
            direccion = @direccion,
            nacionalidad = @nacionalidad
        WHERE id_tutor = @id_tutor;
        IF @@ROWCOUNT = 0
            RAISERROR ('Tutor no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 5. Lotes_Vacunas
-- Create a new vaccine batch
CREATE OR ALTER PROCEDURE sp_CrearLoteVacuna
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
        DECLARE @id_lote UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Lotes_Vacunas (
            id_lote, id_vacuna, numero_lote, cantidad_total, cantidad_disponible,
            fecha_fabricacion, fecha_vencimiento, id_centro, condiciones_almacenamiento
        )
        VALUES (
            @id_lote, @id_vacuna, @numero_lote, @cantidad_total, @cantidad_disponible,
            @fecha_fabricacion, @fecha_vencimiento, @id_centro, @condiciones_almacenamiento
        );
        SELECT @id_lote AS id_lote;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update a vaccine batch
CREATE OR ALTER PROCEDURE sp_ActualizarLoteVacuna
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
        UPDATE Lotes_Vacunas
        SET
            id_vacuna = @id_vacuna,
            numero_lote = @numero_lote,
            cantidad_total = @cantidad_total,
            cantidad_disponible = @cantidad_disponible,
            fecha_fabricacion = @fecha_fabricacion,
            fecha_vencimiento = @fecha_vencimiento,
            id_centro = @id_centro,
            condiciones_almacenamiento = @condiciones_almacenamiento
        WHERE id_lote = @id_lote;
        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 6. Personal_Salud
-- Delete healthcare personnel
CREATE OR ALTER PROCEDURE sp_EliminarPersonalSalud
    @id_personal UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Historial_Vacunacion WHERE id_personal = @id_personal
            UNION
            SELECT 1 FROM Eventos_Adversos WHERE id_personal_reportante = @id_personal
        )
            RAISERROR ('No se puede eliminar el personal debido a registros dependientes', 16, 1);

        DELETE FROM Personal_Salud WHERE id_personal = @id_personal;
        IF @@ROWCOUNT = 0
            RAISERROR ('Personal no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 7. Usuarios
-- Delete a user
CREATE OR ALTER PROCEDURE sp_EliminarUsuario
    @id_usuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Auditoria WHERE id_usuario = @id_usuario
        )
            RAISERROR ('No se puede eliminar el usuario debido a registros dependientes', 16, 1);

        DELETE FROM Usuarios WHERE id_usuario = @id_usuario;
        IF @@ROWCOUNT = 0
            RAISERROR ('Usuario no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 8. Campanas_Vacunacion
-- Create a new vaccination campaign
CREATE OR ALTER PROCEDURE sp_CrearCampanaVacunacion
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
        DECLARE @id_campaña UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Campanas_Vacunacion (
            id_campaña, nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado
        )
        VALUES (
            @id_campaña, @nombre_campaña, @fecha_inicio, @fecha_fin, @objetivo, @id_vacuna, @estado
        );
        SELECT @id_campaña AS id_campaña;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update a vaccination campaign
CREATE OR ALTER PROCEDURE sp_ActualizarCampanaVacunacion
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
        UPDATE Campanas_Vacunacion
        SET
            nombre_campaña = @nombre_campaña,
            fecha_inicio = @fecha_inicio,
            fecha_fin = @fecha_fin,
            objetivo = @objetivo,
            id_vacuna = @id_vacuna,
            estado = @estado
        WHERE id_campaña = @id_campaña;
        IF @@ROWCOUNT = 0
            RAISERROR ('Campaña no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccination campaign
CREATE OR ALTER PROCEDURE sp_EliminarCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Campana_Centro WHERE id_campaña = @id_campaña
        )
            RAISERROR ('No se puede eliminar la campaña debido a registros dependientes', 16, 1);

        DELETE FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña;
        IF @@ROWCOUNT = 0
            RAISERROR ('Campaña no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 9. Campana_Centro
-- Assign a campaign to a center
CREATE OR ALTER PROCEDURE sp_CrearCampanaCentro
    @id_campaña UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_asignacion DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_campaña_centro UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Campana_Centro (
            id_campaña_centro, id_campaña, id_centro, fecha_asignacion
        )
        VALUES (
            @id_campaña_centro, @id_campaña, @id_centro, @fecha_asignacion
        );
        SELECT @id_campaña_centro AS id_campaña_centro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get campaign-center assignment by ID
CREATE OR ALTER PROCEDURE sp_ObtenerCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        cc.*,
        c.nombre_campaña,
        v.nombre_centro
    FROM Campana_Centro cc
    INNER JOIN Campanas_Vacunacion c ON cc.id_campaña = c.id_campaña
    INNER JOIN Centros_Vacunacion v ON cc.id_centro = v.id_centro
    WHERE cc.id_campaña_centro = @id_campaña_centro;
END;
GO

-- 10. Citas
-- Create a new appointment
CREATE OR ALTER PROCEDURE sp_CrearCita
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_cita UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Citas (
            id_cita, id_niño, id_centro, fecha_cita, estado
        )
        VALUES (
            @id_cita, @id_niño, @id_centro, @fecha_cita, @estado
        );
        SELECT @id_cita AS id_cita;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update an appointment
CREATE OR ALTER PROCEDURE sp_ActualizarCita
    @id_cita UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Citas
        SET
            id_niño = @id_niño,
            id_centro = @id_centro,
            fecha_cita = @fecha_cita,
            estado = @estado
        WHERE id_cita = @id_cita;
        IF @@ROWCOUNT = 0
            RAISERROR ('Cita no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get appointments by center and date range
CREATE OR ALTER PROCEDURE sp_ObtenerCitasPorCentro
    @id_centro UNIQUEIDENTIFIER,
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.id_cita,
        n.nombre_completo AS nombre_niño,
        c.fecha_cita,
        c.estado
    FROM Citas c
    INNER JOIN Niños n ON c.id_niño = n.id_niño
    WHERE c.id_centro = @id_centro
    AND c.fecha_cita BETWEEN @fecha_inicio AND @fecha_fin
    ORDER BY c.fecha_cita;
END;
GO

-- 11. Historial_Vacunacion
-- Register a new vaccination
CREATE OR ALTER PROCEDURE sp_RegistrarVacunacion
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

        -- Insert into Historial_Vacunacion
        DECLARE @id_historial UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Historial_Vacunacion (
            id_historial, id_niño, id_lote, id_personal, id_centro,
            fecha_vacunacion, dosis_aplicada, sitio_aplicacion, observaciones
        )
        VALUES (
            @id_historial, @id_niño, @id_lote, @id_personal, @id_centro,
            @fecha_vacunacion, @dosis_aplicada, @sitio_aplicacion, @observaciones
        );

        -- Update available quantity in Lotes_Vacunas
        UPDATE Lotes_Vacunas
        SET cantidad_disponible = cantidad_disponible - 1
        WHERE id_lote = @id_lote AND cantidad_disponible > 0;

        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no disponible o sin stock', 16, 1);

        COMMIT TRANSACTION;
        SELECT @id_historial AS id_historial;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get vaccination history by child ID
CREATE OR ALTER PROCEDURE sp_ObtenerHistorialVacunacion
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        h.*,
        v.nombre AS nombre_vacuna,
        c.nombre_centro,
        p.nombre AS personal_responsable
    FROM Historial_Vacunacion h
    INNER JOIN Lotes_Vacunas l ON h.id_lote = l.id_lote
    INNER JOIN Vacunas v ON l.id_vacuna = v.id_vacuna
    INNER JOIN Centros_Vacunacion c ON h.id_centro = c.id_centro
    INNER JOIN Personal_Salud p ON h.id_personal = p.id_personal
    WHERE h.id_niño = @id_niño
    ORDER BY h.fecha_vacunacion DESC;
END;
GO

-- 12. Inventario_Suministros
-- Update a supply
CREATE OR ALTER PROCEDURE sp_ActualizarSuministro
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
        UPDATE Inventario_Suministros
        SET
            nombre_suministro = @nombre_suministro,
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
            RAISERROR ('Suministro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a supply
CREATE OR ALTER PROCEDURE sp_EliminarSuministro
    @id_suministro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Inventario_Suministros WHERE id_suministro = @id_suministro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Suministro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 13. Esquema_Vacunacion
-- Create a new vaccination schedule
CREATE OR ALTER PROCEDURE sp_CrearEsquemaVacunacion
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_esquema UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Esquema_Vacunacion (
            id_esquema, id_vacuna, orden_dosis, edad_recomendada, descripcion
        )
        VALUES (
            @id_esquema, @id_vacuna, @orden_dosis, @edad_recomendada, @descripcion
        );
        SELECT @id_esquema AS id_esquema;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update a vaccination schedule
CREATE OR ALTER PROCEDURE sp_ActualizarEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Esquema_Vacunacion
        SET
            id_vacuna = @id_vacuna,
            orden_dosis = @orden_dosis,
            edad_recomendada = @edad_recomendada,
            descripcion = @descripcion
        WHERE id_esquema = @id_esquema;
        IF @@ROWCOUNT = 0
            RAISERROR ('Esquema no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 14. Auditoria
-- Log an audit entry
CREATE OR ALTER PROCEDURE sp_RegistrarAuditoria
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
        DECLARE @id_auditoria UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Auditoria (
            id_auditoria, tabla_afectada, id_registro, id_usuario, accion, detalles, ip_origen, fecha_registro
        )
        VALUES (
            @id_auditoria, @tabla_afectada, @id_registro, @id_usuario, @accion, @detalles, @ip_origen, SYSDATETIME()
        );
        SELECT @id_auditoria AS id_auditoria;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 15. Alertas
-- Create a new alert
CREATE OR ALTER PROCEDURE sp_CrearAlerta
    @id_niño UNIQUEIDENTIFIER,
    @tipo_alerta NVARCHAR(100),
    @fecha_alerta DATETIME2,
    @descripcion NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_alerta UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Alertas (
            id_alerta, id_niño, tipo_alerta, fecha_alerta, descripcion, estado
        )
        VALUES (
            @id_alerta, @id_niño, @tipo_alerta, @fecha_alerta, @descripcion, @estado
        );
        SELECT @id_alerta AS id_alerta;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Update an alert
CREATE OR ALTER PROCEDURE sp_ActualizarAlerta
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
        UPDATE Alertas
        SET
            id_niño = @id_niño,
            tipo_alerta = @tipo_alerta,
            fecha_alerta = @fecha_alerta,
            descripcion = @descripcion,
            estado = @estado
        WHERE id_alerta = @id_alerta;
        IF @@ROWCOUNT = 0
            RAISERROR ('Alerta no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 16. Additional Reporting Stored Procedures
-- Get vaccination coverage by center
CREATE OR ALTER PROCEDURE sp_ObtenerCoberturaVacunacion
    @id_centro UNIQUEIDENTIFIER,
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        v.nombre AS nombre_vacuna,
        COUNT(h.id_historial) AS total_vacunados,
        COUNT(DISTINCT h.id_niño) AS niños_vacunados
    FROM Historial_Vacunacion h
    INNER JOIN Lotes_Vacunas l ON h.id_lote = l.id_lote
    INNER JOIN Vacunas v ON l.id_vacuna = v.id_vacuna
    WHERE h.id_centro = @id_centro
    AND h.fecha_vacunacion BETWEEN @fecha_inicio AND @fecha_fin
    GROUP BY v.nombre
    ORDER BY v.nombre;
END;
GO

-- Get incomplete vaccination schedules
CREATE OR ALTER PROCEDURE sp_ObtenerEsquemasIncompletos
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        v.nombre AS nombre_vacuna,
        e.orden_dosis,
        e.edad_recomendada
    FROM Esquema_Vacunacion e
    INNER JOIN Vacunas v ON e.id_vacuna = v.id_vacuna
    WHERE NOT EXISTS (
        SELECT 1 
        FROM Historial_Vacunacion h 
        INNER JOIN Lotes_Vacunas l ON h.id_lote = l.id_lote
        WHERE h.id_niño = @id_niño 
        AND l.id_vacuna = e.id_vacuna 
        AND h.dosis_aplicada = e.orden_dosis
    )
    ORDER BY v.nombre, e.orden_dosis;
END;
GO